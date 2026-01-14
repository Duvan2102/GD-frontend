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
  users: Usuario[],
  excludeProcessStates: boolean = false
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
    if (excludeProcessStates) {
      // Solo mostrar estados básicos: APROBADO, RECHAZADO, CANCELADA (excluir APROB-POCESADO)
      result = result.filter(req => ['APROBADO', 'RECHAZADO', 'CANCELADA'].includes(req.status));
    } else {
      // Incluir también APROB-POCESADO para otras vistas
      result = result.filter(req => ['APROBADO', 'RECHAZADO', 'CANCELADA', 'APROB-POCESADO'].includes(req.status));
    }
  } else {
    if (excludeProcessStates) {
      // Solo mostrar PENDIENTE (excluir APROB-PENDIENTE que es para procesadores)
      result = result.filter(req => req.status === 'PENDIENTE');
    } else {
      // Incluir tanto PENDIENTE (aprobadores) como APROB-PENDIENTE (procesadores)
      result = result.filter(req => req.status === 'PENDIENTE' || req.status === 'APROB-PENDIENTE');
    }
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
  users: Usuario[],
  currentUser?: Usuario
): { displayedRequests: any[], totalFiltered: number } {
  const getTypologyDescription = (typeId: string): string => {
    const typology = typologies.find(t => t.idTipologia.toString() === typeId);
    return typology ? typology.descripcion : typeId;
  };

  const getUserFullName = (username: string): string => {
    const user = users.find(u => u.usuario === username);
    return user ? `${user.nombres} ${user.apellidos}` : username;
  };

  // Función para verificar si una tipología pertenece al área del usuario actual
  const isTypologyInUserArea = (typeId: string): boolean => {
    if (!currentUser || !currentUser.cargo?.area?.idArea) {
      return true; // Si no hay usuario o área, mostrar todas
    }

    const typology = typologies.find(t => t.idTipologia.toString() === typeId);
    if (!typology || !typology.cargo?.area?.idArea) {
      return true; // Si no se encuentra la tipología o no tiene área, mostrar
    }

    const userAreaId = currentUser.cargo.area.idArea;
    const typologyAreaId = typology.cargo.area.idArea;
    return typologyAreaId === userAreaId;
  };

  let result = [...approvalsList];

  // Filtrar por área del usuario: mostrar solo solicitudes cuya tipología pertenece al área del usuario
  result = result.filter(req => isTypologyInUserArea(req.type));

  // Excluir siempre las solicitudes en estado PENDIENTE
  result = result.filter(req => req.status !== 'PENDIENTE');

  if (showOnlyManaged) {
    // CANCELADAS/RECHAZADAS: mostrar solo CANCELADA y RECHAZADO
    result = result.filter(req => ['RECHAZADO', 'CANCELADA'].includes(req.status));
  } else {
    // APROBADOS: mostrar APROBADO, APROB-PENDIENTE y APROB-POCESADO
    result = result.filter(req => ['APROBADO', 'APROB-PENDIENTE', 'APROB-POCESADO'].includes(req.status));
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
  const displayedRequests = result.slice(start, start + itemsPerPage).map(req => {
    const estadoOriginal = req.fullData?.estado || '';
    const estadoOriginalUpper = estadoOriginal.toUpperCase().trim();
    const tipologia = typologies.find(t => t.idTipologia.toString() === req.type);
    const requiereProceso = tipologia?.requiereProceso === true;
    
    const procesadores = req.fullData?.procesadores || 
                        req.fullData?.procesadoresAsignados || 
                        req.fullData?.procesadoresPostAprobacion || [];
    const hayProcesadores = Array.isArray(procesadores) && procesadores.length > 0;
    
    let statusToShow = req.status;
    
    if (estadoOriginalUpper === 'APROBADO PROCESO' && requiereProceso) {
      if (hayProcesadores && req.status === 'APROBADO') {
        statusToShow = 'APROB-POCESADO';
      } else {
        statusToShow = 'APROB-PENDIENTE';
      }
    } else if (estadoOriginalUpper === 'APROBADO' && requiereProceso && hayProcesadores) {
      statusToShow = 'APROB-POCESADO';
    }
    
    return {
      ...req,
      status: statusToShow,
      type: getTypologyDescription(req.type),
      // Preservamos objetos para poder usar nombre completo en tooltip
      approvers: req.approvers.map(a => ({ initials: a.initials, fullName: a.fullName })),
      creatorUser: req.creatorFullName
    };
  });

  return { displayedRequests, totalFiltered };
}