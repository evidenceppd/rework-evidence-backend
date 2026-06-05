'use strict';

/**
 * Estratégias de cálculo de pontuação por formType.
 * Cada estratégia recebe o objeto `diagnosis` (seções aninhadas) e retorna um score numérico.
 * Os paths das chaves correspondem às perguntas definidas em diagnosis.questions.js.
 */
const SCORE_STRATEGIES = {
  agro(diagnosis) {
    let score = 0;
    if (diagnosis.digital_presence?.marketing_generates_opportunities === 'Não gera') score += 20;
    if (diagnosis.digital_presence?.marketing_generates_opportunities === 'Pouco') score += 10;
    if (diagnosis.commercial?.uses_crm === 'Não') score += 10;
    if (diagnosis.commercial?.structured_sales_process === 'Não') score += 15;
    if (diagnosis.commercial?.structured_sales_process === 'Parcial') score += 8;
    if (diagnosis.positioning?.communication === 'Genérica') score += 10;
    if (diagnosis.positioning?.communication === 'Confusa') score += 15;
    if (diagnosis.positioning?.clear_differential === 'Não') score += 15;
    if (diagnosis.digital_presence?.client_understands_offer === 'Não') score += 15;
    if (diagnosis.digital_presence?.well_positioned === 'Não') score += 15;
    if (diagnosis.final_perception?.main_challenge === 'Gerar mais oportunidades') score += 20;
    if (diagnosis.final_perception?.main_challenge === 'Melhorar conversão de vendas') score += 15;
    if (diagnosis.final_perception?.main_challenge === 'Estrutura comercial') score += 15;
    if (diagnosis.growth?.has_growth_goal === 'Sim') score += 10;
    return score;
  },

  commerce(diagnosis) {
    let score = 0;
    if (diagnosis.digital_presence?.generates_real_opportunities === 'Não gera') score += 20;
    if (diagnosis.digital_presence?.generates_real_opportunities === 'Pouco') score += 10;
    if (diagnosis.commercial?.uses_crm === 'Não') score += 10;
    if (diagnosis.commercial?.structured_sales_process === 'Não') score += 15;
    if (diagnosis.commercial?.structured_sales_process === 'Parcial') score += 8;
    if (diagnosis.commercial?.loses_sales_lack_of_follow_up === 'Sim') score += 10;
    if (diagnosis.positioning?.communication === 'Genérica') score += 10;
    if (diagnosis.positioning?.communication === 'Confusa') score += 15;
    if (diagnosis.positioning?.clear_differential === 'Não') score += 15;
    if (diagnosis.positioning?.products_well_presented === 'Não') score += 10;
    if (diagnosis.digital_presence?.well_positioned === 'Não') score += 15;
    if (diagnosis.final_perception?.main_challenge === 'Gerar mais oportunidades') score += 20;
    if (diagnosis.final_perception?.main_challenge === 'Melhorar conversão de vendas') score += 15;
    if (diagnosis.final_perception?.main_challenge === 'Organização do processo comercial') score += 15;
    if (diagnosis.growth?.has_growth_goal === 'Sim') score += 10;
    return score;
  },

  industry(diagnosis) {
    let score = 0;
    if (diagnosis.digital_presence?.marketing_generates_opportunities === 'Não gera') score += 20;
    if (diagnosis.digital_presence?.marketing_generates_opportunities === 'Pouco') score += 10;
    if (diagnosis.commercial?.uses_crm === 'Não') score += 10;
    if (diagnosis.commercial?.structured_sales_process === 'Não') score += 15;
    if (diagnosis.commercial?.structured_sales_process === 'Parcial') score += 8;
    if (diagnosis.commercial?.depends_on_salesperson === 'Sim') score += 10;
    if (diagnosis.positioning?.communication === 'Genérica') score += 10;
    if (diagnosis.positioning?.communication === 'Confusa') score += 15;
    if (diagnosis.positioning?.clear_differential === 'Não') score += 15;
    if (diagnosis.positioning?.defined_audience === 'Não') score += 10;
    if (diagnosis.digital_presence?.well_positioned_digitally === 'Não') score += 15;
    if (diagnosis.final_perception?.main_challenge === 'Gerar mais demanda') score += 20;
    if (diagnosis.final_perception?.main_challenge === 'Melhorar conversão de vendas') score += 15;
    if (diagnosis.final_perception?.main_challenge === 'Estrutura comercial') score += 15;
    if (diagnosis.growth?.has_growth_goal === 'Sim') score += 10;
    return score;
  },

  services(diagnosis) {
    let score = 0;
    if (diagnosis.digital_presence?.generates_new_clients === 'Não gera') score += 20;
    if (diagnosis.digital_presence?.generates_new_clients === 'Pouco') score += 10;
    if (diagnosis.commercial?.uses_system_or_tool === 'Não') score += 10;
    if (diagnosis.commercial?.structured_process === 'Não') score += 15;
    if (diagnosis.commercial?.structured_process === 'Parcial') score += 8;
    if (diagnosis.commercial?.depends_on_referral_or_relationship === 'Sim') score += 10;
    if (diagnosis.positioning?.communication === 'Genérica') score += 10;
    if (diagnosis.positioning?.communication === 'Confusa') score += 15;
    if (diagnosis.positioning?.clear_differential === 'Não') score += 15;
    if (diagnosis.positioning?.defined_audience === 'Não') score += 10;
    if (diagnosis.digital_presence?.well_positioned === 'Não') score += 15;
    if (diagnosis.final_perception?.main_challenge === 'Gerar mais clientes') score += 20;
    if (diagnosis.final_perception?.main_challenge === 'Melhorar conversão de vendas') score += 15;
    if (diagnosis.final_perception?.main_challenge === 'Organização do processo comercial') score += 15;
    if (diagnosis.growth?.has_growth_goal === 'Sim') score += 10;
    return score;
  },

  health(diagnosis) {
    let score = 0;
    if (diagnosis.digital_presence?.generates_new_patients === 'Não gera') score += 20;
    if (diagnosis.digital_presence?.generates_new_patients === 'Pouco') score += 10;
    if (diagnosis.organization_and_relationship?.uses_system === 'Não') score += 10;
    if (diagnosis.organization_and_relationship?.organized_process === 'Não') score += 15;
    if (diagnosis.organization_and_relationship?.organized_process === 'Parcial') score += 8;
    if (diagnosis.organization_and_relationship?.strategy_to_bring_back === 'Não') score += 10;
    if (diagnosis.positioning?.communication === 'Genérica') score += 10;
    if (diagnosis.positioning?.communication === 'Confusa') score += 15;
    if (diagnosis.positioning?.clear_differential === 'Não') score += 15;
    if (diagnosis.digital_presence?.patient_understands_services === 'Não') score += 15;
    if (diagnosis.positioning?.well_positioned === 'Não') score += 15;
    if (diagnosis.final_perception?.main_challenge === 'Atrair mais pacientes') score += 20;
    if (diagnosis.final_perception?.main_challenge === 'Melhorar conversão de atendimento') score += 15;
    if (diagnosis.final_perception?.main_challenge === 'Organização interna') score += 15;
    if (diagnosis.growth?.has_growth_goal === 'Sim') score += 10;
    return score;
  },
};

function calculateScore(formType, diagnosis) {
  const strategy = SCORE_STRATEGIES[formType];
  return strategy ? strategy(diagnosis) : 0;
}

function getTemperature(score) {
  if (score >= 60) return 'hot';
  if (score >= 30) return 'warm';
  return 'cold';
}

module.exports = { calculateScore, getTemperature };
