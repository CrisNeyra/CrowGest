let activePermissions = [];

export function setActivePermissions(permissions) {
  activePermissions = permissions || [];
}

export function getActivePermissions() {
  return activePermissions;
}

export function clearActivePermissions() {
  activePermissions = [];
}
