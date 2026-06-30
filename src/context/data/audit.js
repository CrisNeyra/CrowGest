import { collection, doc } from 'firebase/firestore';
import { db } from '../../firebase';

/**
 * Helpers de auditoría desacoplados del DataContext.
 * Reciben el usuario actual y devuelven funciones puras de construcción/escritura.
 */
export function createAuditHelpers(currentUser) {
  const buildAuditLog = ({
    action,
    entity,
    entityId,
    entityLabel = '',
    amount = null,
    metadata = {},
  }) => ({
    action,
    entity,
    entityId: entityId || null,
    entityLabel,
    amount,
    metadata,
    userId: currentUser?.uid || null,
    userEmail: currentUser?.email || 'Sistema',
    createdAt: new Date().toISOString(),
  });

  const auditInBatch = (batch, payload) => {
    const auditRef = doc(collection(db, 'audit_log'));
    batch.set(auditRef, buildAuditLog(payload));
    return auditRef.id;
  };

  return { buildAuditLog, auditInBatch };
}
