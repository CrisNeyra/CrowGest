import { apiFetch, isApiEnabled } from './httpClient';

export { isApiEnabled };

export async function crearComprobanteBorrador(payload) {
  return apiFetch('/api/v1/ventas/comprobantes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function emitirComprobanteFiscal(comprobanteId, payload) {
  return apiFetch(`/api/v1/ventas/comprobantes/${comprobanteId}/emitir`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function crearNotaCreditoFiscal(comprobanteId, payload) {
  return apiFetch(`/api/v1/ventas/comprobantes/${comprobanteId}/nota-credito`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function desvincularRemitoComprobante(remitoId, comprobanteId, payload) {
  return apiFetch(`/api/v1/ventas/remitos/${remitoId}/desvincular/${comprobanteId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
