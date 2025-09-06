import { Approval } from '../pages/approvals/approvals';
import { Typology } from '../services/typology.service';
import { Usuario } from '../interfaces/common.interfaces';

export function applyViewLogic(
  approvalsList: Approval[],
  showOnlyManaged: boolean,
  searchTerm: string,
  currentOrder: string,
  ascendingOrder: boolean,
  itemsPerPage: number,
  currentPage: number,
  typologies: Typology[],
  users: Usuario[]
): { displayedRequests: any[], totalFiltered: number } {
  const getTypologyDescription = (typeId: string): string => {
    const typology = typologies.find(t => t.idTipologia.toString() === typeId);
    return typology ? typology.descripcion : typeId;
  };

  const getUserFullName = (username: string): string => {
    const user = users.find(u => u.usuario === username);
    return user ? `${user.nombres} ${user.apellidos}` : username;
  };

  let result = [...approvalsList];

  if (showOnlyManaged) {
    result = result.filter(req => ['APROBADO', 'RECHAZADO', 'CANCELADA'].includes(req.status));
  } else {
    result = result.filter(req => req.status === 'PENDIENTE');
  }

  if (searchTerm) {
    const search = searchTerm.toLowerCase();
    result = result.filter(req =>
      getTypologyDescription(req.type).toLowerCase().includes(search) ||
      req.creatorFullName.toLowerCase().includes(search) ||
      req.id.toLowerCase().includes(search)
    );
  }

  const totalFiltered = result.length;

  result.sort((a, b) => {
    const aVal = (a as any)[currentOrder];
    const bVal = (b as any)[currentOrder];
    if (aVal < bVal) {
      return ascendingOrder ? -1 : 1;
    }
    if (aVal > bVal) {
      return ascendingOrder ? 1 : -1;
    }
    return 0;
  });

  const start = (currentPage - 1) * itemsPerPage;
  const displayedRequests = result.slice(start, start + itemsPerPage).map(req => ({
    ...req,
    type: getTypologyDescription(req.type),
    // Preservamos objetos para poder usar nombre completo en tooltip
    approvers: req.approvers.map(a => ({ initials: a.initials, fullName: a.fullName })),
    creatorUser: req.creatorFullName
  }));

  return { displayedRequests, totalFiltered };
}

export function applyApprovalDetailsViewLogic(
  approvalsList: Approval[],
  showOnlyManaged: boolean,
  searchTerm: string,
  currentOrder: string,
  ascendingOrder: boolean,
  itemsPerPage: number,
  currentPage: number,
  typologies: Typology[],
  users: Usuario[]
): { displayedRequests: any[], totalFiltered: number } {
  const getTypologyDescription = (typeId: string): string => {
    const typology = typologies.find(t => t.idTipologia.toString() === typeId);
    return typology ? typology.descripcion : typeId;
  };

  const getUserFullName = (username: string): string => {
    const user = users.find(u => u.usuario === username);
    return user ? `${user.nombres} ${user.apellidos}` : username;
  };

  let result = [...approvalsList];

  if (showOnlyManaged) {
    result = result.filter(req => ['RECHAZADO', 'CANCELADA'].includes(req.status));
  } else {
    result = result.filter(req => req.status === 'APROBADO');
  }

  if (searchTerm) {
    const search = searchTerm.toLowerCase();
    result = result.filter(req =>
      getTypologyDescription(req.type).toLowerCase().includes(search) ||
      req.creatorFullName.toLowerCase().includes(search) ||
      req.id.toLowerCase().includes(search)
    );
  }

  const totalFiltered = result.length;

  result.sort((a, b) => {
    const aVal = (a as any)[currentOrder];
    const bVal = (b as any)[currentOrder];
    if (aVal < bVal) {
      return ascendingOrder ? -1 : 1;
    }
    if (aVal > bVal) {
      return ascendingOrder ? 1 : -1;
    }
    return 0;
  });

  const start = (currentPage - 1) * itemsPerPage;
  const displayedRequests = result.slice(start, start + itemsPerPage).map(req => ({
    ...req,
    type: getTypologyDescription(req.type),
    // Preservamos objetos para poder usar nombre completo en tooltip
    approvers: req.approvers.map(a => ({ initials: a.initials, fullName: a.fullName })),
    creatorUser: req.creatorFullName
  }));

  return { displayedRequests, totalFiltered };
}