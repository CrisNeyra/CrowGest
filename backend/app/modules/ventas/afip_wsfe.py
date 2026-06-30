"""Cliente WSAA + WSFEv1 de ARCA (AFIP) para emisión real de CAE.

Diseño:
- WSAA: se arma un TRA (ticket de requerimiento de acceso), se firma con el
  certificado (CMS/PKCS#7) y se obtiene un token+sign válido ~12 hs.
- WSFEv1: con token+sign se llama a FECAESolicitar para obtener el CAE.

Las dependencias pesadas (`zeep`, `cryptography`) se importan de forma perezosa
para no requerirlas en modo simulado ni en CI sin certificados.

Este cliente se activa solo cuando `afip_mode` es `homologacion` o `production`
y hay certificado + clave configurados. En tests se inyecta un cliente fake.
"""

from __future__ import annotations

import base64
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from app.core.exceptions import bad_request
from app.core.settings import Settings


@dataclass(frozen=True, slots=True)
class WsfeCaeResult:
    cae: str
    cae_vencimiento: datetime
    numero_fiscal: int
    resultado: str


# Mapeo de letra/tipo interno a código de comprobante AFIP (subset usual).
TIPO_AFIP_POR_LETRA = {
    ("FA", "A"): 1,
    ("FB", "B"): 6,
    ("FC", "C"): 11,
    ("NC", "A"): 3,
    ("NC", "B"): 8,
    ("NC", "C"): 13,
}


def codigo_comprobante_afip(tipo_comprobante: str, letra: str) -> int:
    codigo = TIPO_AFIP_POR_LETRA.get((tipo_comprobante.upper(), letra.upper()))
    if codigo is None:
        raise bad_request(
            f"Tipo de comprobante AFIP no mapeado: {tipo_comprobante} {letra}",
            "AFIP_TIPO_NO_MAPEADO",
        )
    return codigo


class WsaaClient:
    """Obtiene token y sign de WSAA firmando el TRA con el certificado."""

    SERVICE = "wsfe"

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def _build_tra(self) -> str:
        now = datetime.now(UTC)
        unique_id = secrets.randbelow(2**31)
        gen = (now - timedelta(minutes=10)).strftime("%Y-%m-%dT%H:%M:%S")
        exp = (now + timedelta(hours=12)).strftime("%Y-%m-%dT%H:%M:%S")
        return (
            '<?xml version="1.0" encoding="UTF-8"?>'
            "<loginTicketRequest version=\"1.0\">"
            f"<header><uniqueId>{unique_id}</uniqueId>"
            f"<generationTime>{gen}</generationTime>"
            f"<expirationTime>{exp}</expirationTime></header>"
            f"<service>{self.SERVICE}</service>"
            "</loginTicketRequest>"
        )

    def _sign_tra(self, tra_xml: str) -> str:
        """Firma el TRA en formato CMS/PKCS#7 (DER, base64)."""
        try:
            from cryptography import x509
            from cryptography.hazmat.primitives import hashes
            from cryptography.hazmat.primitives.serialization import (
                Encoding,
                load_pem_private_key,
                pkcs7,
            )
        except ImportError as exc:  # pragma: no cover - depende del entorno
            raise bad_request(
                "Falta 'cryptography' para firmar el TRA de WSAA",
                "AFIP_DEP_FALTANTE",
            ) from exc

        if not self._settings.afip_cert_path or not self._settings.afip_key_path:
            raise bad_request(
                "Configure AFIP_CERT_PATH y AFIP_KEY_PATH para WSAA",
                "AFIP_CERT_FALTANTE",
            )

        with open(self._settings.afip_cert_path, "rb") as fh:
            cert = x509.load_pem_x509_certificate(fh.read())
        with open(self._settings.afip_key_path, "rb") as fh:
            key = load_pem_private_key(fh.read(), password=None)

        der = (
            pkcs7.PKCS7SignatureBuilder()
            .set_data(tra_xml.encode("utf-8"))
            .add_signer(cert, key, hashes.SHA256())
            .sign(Encoding.DER, [pkcs7.PKCS7Options.Binary])
        )
        return base64.b64encode(der).decode("ascii")

    def login(self) -> tuple[str, str]:
        """Devuelve (token, sign) usando zeep contra WSAA."""
        try:
            from zeep import Client
        except ImportError as exc:  # pragma: no cover
            raise bad_request("Falta 'zeep' para invocar WSAA", "AFIP_DEP_FALTANTE") from exc

        tra = self._build_tra()
        cms = self._sign_tra(tra)
        client = Client(self._settings.afip_wsaa_url)
        response = client.service.loginCms(cms)
        return _extraer_token_sign(response)


def _extraer_token_sign(login_response: str) -> tuple[str, str]:
    """Parsea el XML de loginCms y extrae token y sign."""
    import xml.etree.ElementTree as ET

    root = ET.fromstring(login_response)
    token = root.findtext(".//token")
    sign = root.findtext(".//sign")
    if not token or not sign:
        raise bad_request("Respuesta WSAA sin token/sign", "AFIP_WSAA_INVALIDO")
    return token, sign


class WsfeClient:
    """Solicita CAE a WSFEv1 (FECAESolicitar)."""

    def __init__(self, settings: Settings, wsaa: WsaaClient | None = None) -> None:
        self._settings = settings
        self._wsaa = wsaa or WsaaClient(settings)

    def solicitar_cae(
        self,
        *,
        tipo_comprobante: str,
        letra: str,
        punto_venta: int,
        total,
        numero_fiscal: int,
    ) -> WsfeCaeResult:
        try:
            from zeep import Client
        except ImportError as exc:  # pragma: no cover
            raise bad_request("Falta 'zeep' para invocar WSFE", "AFIP_DEP_FALTANTE") from exc

        if not self._settings.afip_cuit:
            raise bad_request("Configure AFIP_CUIT para WSFE", "AFIP_CUIT_FALTANTE")

        token, sign = self._wsaa.login()
        cbte_tipo = codigo_comprobante_afip(tipo_comprobante, letra)
        cuit = int(self._settings.afip_cuit)
        hoy = datetime.now(UTC).strftime("%Y%m%d")

        client = Client(self._settings.afip_wsfe_url)
        auth = {"Token": token, "Sign": sign, "Cuit": cuit}
        total_float = float(total)
        neto = round(total_float / 1.21, 2)
        iva = round(total_float - neto, 2)

        detalle = {
            "Concepto": 1,
            "DocTipo": 99,
            "DocNro": 0,
            "CbteDesde": numero_fiscal,
            "CbteHasta": numero_fiscal,
            "CbteFch": hoy,
            "ImpTotal": round(total_float, 2),
            "ImpTotConc": 0,
            "ImpNeto": neto,
            "ImpOpEx": 0,
            "ImpIVA": iva,
            "ImpTrib": 0,
            "MonId": "PES",
            "MonCotiz": 1,
            "Iva": {"AlicIva": [{"Id": 5, "BaseImp": neto, "Importe": iva}]},
        }
        cabecera = {"CantReg": 1, "PtoVta": punto_venta, "CbteTipo": cbte_tipo}
        request = {"FeCabReq": cabecera, "FeDetReq": {"FECAEDetRequest": [detalle]}}

        response = client.service.FECAESolicitar(Auth=auth, FeCAEReq=request)
        return _parse_wsfe_response(response, numero_fiscal)


def _parse_wsfe_response(response, numero_fiscal: int) -> WsfeCaeResult:
    detalle = response.FeDetResp.FECAEDetResponse[0]
    resultado = detalle.Resultado
    if resultado != "A":
        observaciones = getattr(detalle, "Observaciones", None)
        msg = "WSFE rechazó el comprobante"
        if observaciones:
            obs = observaciones.Obs[0]
            msg = f"WSFE: {obs.Msg} (cod {obs.Code})"
        raise bad_request(msg, "AFIP_WSFE_RECHAZADO")

    vto = datetime.strptime(detalle.CAEFchVto, "%Y%m%d").replace(tzinfo=UTC)
    return WsfeCaeResult(
        cae=str(detalle.CAE),
        cae_vencimiento=vto,
        numero_fiscal=numero_fiscal,
        resultado=resultado,
    )
