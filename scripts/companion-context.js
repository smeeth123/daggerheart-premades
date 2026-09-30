/** Native companion links resolve to Actor documents. Keep the companion as the roll source. */
export function companionPartner(actor){
  const partner=actor?.type==='companion'?actor.system?.partner:null;
  return partner?.type==='character'?partner:null;
}
export function attackBeneficiary(actor){return companionPartner(actor)??actor;}
export function linkedCompanion(actor){
  const companion=actor?.system?.companion;
  return companion?.type==='companion'&&companionPartner(companion)?.uuid===actor.uuid?companion:null;
}
