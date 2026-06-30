import { createContext, useContext, useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import {
  getPermissionsForRole,
  hasPermission as checkPermission,
  ROLES,
} from '../utils/permissions';
import { clearActivePermissions, setActivePermissions } from '../utils/permissionStore';
import { DEMO_ACCESS, isDemoUser } from '../config/demoAccess';

const PermissionsContext = createContext();

export function PermissionsProvider({ children }) {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setProfile(null);
      setPermissions([]);
      clearActivePermissions();
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const userRef = doc(db, 'usuarios', currentUser.uid);

    const unsub = onSnapshot(
      userRef,
      async (snap) => {
        if (!snap.exists()) {
          const rol = isDemoUser(currentUser.email) ? DEMO_ACCESS.role : 'vendedor';
          const nuevo = {
            email: currentUser.email || '',
            nombre: currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario',
            rol,
            createdAt: new Date().toISOString(),
          };
          await setDoc(userRef, nuevo);
          setProfile({ id: currentUser.uid, ...nuevo });
          const perms = getPermissionsForRole(rol);
          setPermissions(perms);
          setActivePermissions(perms);
        } else {
          const data = snap.data();
          let rol = data.rol || 'vendedor';
          if (isDemoUser(currentUser.email) && rol !== DEMO_ACCESS.role) {
            rol = DEMO_ACCESS.role;
            await updateDoc(userRef, {
              rol,
              updatedAt: new Date().toISOString(),
            });
          }
          setProfile({ id: currentUser.uid, ...data, rol });
          const perms = getPermissionsForRole(rol);
          setPermissions(perms);
          setActivePermissions(perms);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error al cargar perfil de usuario:', error);
        setLoading(false);
      }
    );

    return unsub;
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !checkPermission(permissions, 'users:manage')) {
      setUsuarios([]);
      return undefined;
    }

    const unsub = onSnapshot(collection(db, 'usuarios'), (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsuarios(list.sort((a, b) => (a.email || '').localeCompare(b.email || '')));
    });

    return unsub;
  }, [currentUser, permissions]);

  const can = (permission) => checkPermission(permissions, permission);

  const updateUserRole = async (uid, rol) => {
    if (!can('users:manage')) {
      throw new Error('No tenés permiso para administrar usuarios');
    }
    if (!ROLES[rol]) {
      throw new Error('Rol inválido');
    }
    await updateDoc(doc(db, 'usuarios', uid), {
      rol,
      updatedAt: new Date().toISOString(),
    });
    if (uid === currentUser?.uid) {
      const perms = getPermissionsForRole(rol);
      setPermissions(perms);
      setActivePermissions(perms);
    }
  };

  const value = {
    profile,
    permissions,
    usuarios,
    loading,
    can,
    isAdmin: profile?.rol === 'admin',
    updateUserRole,
    roles: ROLES,
  };

  return (
    <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
  );
}

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions debe usarse dentro de PermissionsProvider');
  }
  return context;
};
