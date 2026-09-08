import { base44 } from '../api/base44Client.js';
import { logAudit } from './audit.js';

export const INCIDENT_STATUS = {
  DETECTED: 'DETECTED',
  CONTAINED: 'CONTAINED',
  UNDER_INVESTIGATION: 'UNDER_INVESTIGATION',
  ESCALATED: 'ESCALATED',
  REMEDIATED: 'REMEDIATED',
  CLOSED: 'CLOSED',
};

export const RISK_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

/**
 * Report a new Data Incident
 */
export async function reportDataIncident({
  user,
  title,
  incident_type,
  systems_affected,
  data_categories,
  estimated_records_affected = 0,
  risk_level = RISK_LEVELS.MEDIUM,
  investigation_notes = '',
}) {
  const incident_id = `INC-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const detected_at = new Date().toISOString();

  const record = {
    incident_id,
    title,
    detected_at,
    reported_by: user?.email || 'SYSTEM',
    incident_type,
    systems_affected,
    data_categories,
    estimated_records_affected: Number(estimated_records_affected),
    risk_level,
    containment_status: 'UNCONTAINED',
    workflow_status: INCIDENT_STATUS.DETECTED,
    investigation_notes,
    escalated_to_ums_dpo: false,
  };

  if (base44?.entities?.DataIncident) {
    await base44.entities.DataIncident.create(record);
  }

  await logAudit({
    user,
    action: 'DATA_INCIDENT_REPORTED',
    action_type: 'SECURITY_EVENT',
    module: 'DataIncident',
    resource_type: 'DataIncident',
    resource_id: incident_id,
    result: 'SUCCESS',
    details: { incident_id, title, risk_level },
  });

  return record;
}

/**
 * Escalate incident to UMS Data Protection Officer (DPO) / Jabatan Digital
 */
export async function escalateIncidentToDPO(user, incidentDbId, incidentId, escalationNotes = '') {
  const escalated_at = new Date().toISOString();
  
  if (base44?.entities?.DataIncident && incidentDbId) {
    await base44.entities.DataIncident.update(incidentDbId, {
      workflow_status: INCIDENT_STATUS.ESCALATED,
      escalated_to_ums_dpo: true,
      escalated_at,
      investigation_notes: escalationNotes,
    });
  }

  await logAudit({
    user,
    action: 'DATA_INCIDENT_ESCALATED_DPO',
    action_type: 'SECURITY_EVENT',
    module: 'DataIncident',
    resource_type: 'DataIncident',
    resource_id: incidentId,
    result: 'SUCCESS',
    details: { incidentId, escalated_at, escalationNotes },
  });

  return true;
}
