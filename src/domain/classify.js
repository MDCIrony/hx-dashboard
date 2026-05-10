// src/domain/classify.js
import {
  COMP_COLS, FAILURE_THRESHOLD, STALE_CONTACT_DAYS, priorityOf
} from './rules.js';

export function classifyVehicle(v) {
  const age = v.contact_age_days;
  const sinCom = age !== null && age > STALE_CONTACT_DAYS;
  const hasContact = age !== null;
  const hasComps = COMP_COLS.some(c => v.comps[c] !== null);
  const sinContactoTotal = !hasContact && !hasComps;
  const sinInfoConCom = hasContact && !hasComps && !sinCom;

  const failed = [];
  for (const c of COMP_COLS) {
    const val = v.comps[c];
    if (val !== null && val < FAILURE_THRESHOLD) {
      failed.push({
        component: c,
        value: Math.round(val * 1000) / 10,
        priority: priorityOf(c)
      });
    }
  }
  failed.sort((a, b) => a.priority - b.priority);

  let status;
  if (sinCom) status = 'sin_comunicacion';
  else if (sinContactoTotal) status = 'sin_datos';
  else if (sinInfoConCom) status = 'falla_p1';
  else if (!hasComps) status = 'sin_datos';
  else if (failed.some(f => f.priority === 1)) status = 'falla_p1';
  else if (failed.some(f => f.priority === 2)) status = 'falla_p2';
  else if (failed.some(f => f.priority === 3)) status = 'ok_con_otros';
  else status = 'ok';

  return {
    ...v,
    status,
    failed_components: failed,
    flags: {
      sin_comunicacion: sinCom,
      has_contact: hasContact,
      has_comps: hasComps,
      sin_contacto_total: sinContactoTotal,
      sin_info_con_com: sinInfoConCom
    }
  };
}
