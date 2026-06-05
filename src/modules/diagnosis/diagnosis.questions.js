'use strict';

/**
 * Definição estática dos formulários de diagnóstico.
 * Cada chave de `diagnosis` em cada questão corresponde ao path utilizado
 * no cálculo de pontuação em diagnosis.scoring.js.
 */
const FORM_TYPES = {
  // ─── Agro / Pecuária ────────────────────────────────────────────────────────
  agro: {
    label: 'Agro / Pecuária',
    sections: [
      {
        key: 'company',
        title: '1. Sobre a Empresa',
        questions: [
          { key: 'segment', label: 'Segmento', type: 'single', required: false, options: ['Grãos', 'Pecuária', 'Horticultura', 'Agroindústria', 'Outros'] },
          { key: 'operation_format', label: 'Formato de atuação', type: 'single', required: false, options: ['Produtor rural', 'Cooperativa', 'Distribuidor', 'Outros'] },
          { key: 'market_time', label: 'Tempo de mercado', type: 'single', required: false, options: ['0–2 anos', '3–5 anos', '6–10 anos', 'Mais de 10 anos'] },
        ],
      },
      {
        key: 'sales_and_demand',
        title: '2. Vendas e Demanda',
        questions: [
          { key: 'main_sales_source', label: 'De onde vem a maior parte das suas vendas?', type: 'single', required: false, options: ['Indicação', 'Equipe comercial', 'Representantes', 'Marketing digital', 'Outros'] },
          { key: 'generates_enough_opportunities', label: 'Sua empresa gera oportunidades suficientes?', type: 'single', required: false, options: ['Sim', 'Não', 'Poderia melhorar'] },
          { key: 'converts_interested_clients', label: 'Quando um cliente demonstra interesse, sua equipe consegue converter bem?', type: 'single', required: false, options: ['Sim', 'Não', 'Parcial'] },
        ],
      },
      {
        key: 'digital_presence',
        title: '3. Presença Digital e Marketing',
        questions: [
          { key: 'has_presence', label: 'Sua empresa possui:', type: 'single', required: false, options: ['Site', 'Redes sociais', 'Ambos', 'Nenhum'] },
          { key: 'client_understands_offer', label: 'Seu cliente entende claramente o que você oferece ao ver sua comunicação?', type: 'single', required: false, options: ['Sim', 'Não', 'Parcial'] },
          { key: 'marketing_generates_opportunities', label: 'Hoje, seu marketing gera oportunidades reais de negócio?', type: 'single', required: false, options: ['Sim', 'Pouco', 'Não gera'] },
          { key: 'well_positioned', label: 'Você acredita que está bem posicionado digitalmente?', type: 'single', required: false, options: ['Sim', 'Não', 'Não sei'] },
        ],
      },
      {
        key: 'positioning',
        title: '4. Posicionamento',
        questions: [
          { key: 'clear_differential', label: 'Seu diferencial está claro para o mercado?', type: 'single', required: false, options: ['Sim', 'Não', 'Parcial'] },
          { key: 'defined_audience', label: 'Seu público está bem definido?', type: 'single', required: false, options: ['Sim', 'Não', 'Parcial'] },
          { key: 'communication', label: 'Sua comunicação é:', type: 'single', required: false, options: ['Clara e objetiva', 'Genérica', 'Confusa'] },
        ],
      },
      {
        key: 'commercial',
        title: '5. Comercial',
        questions: [
          { key: 'structured_sales_process', label: 'Existe um processo de vendas estruturado?', type: 'single', required: false, options: ['Sim', 'Não', 'Parcial'] },
          { key: 'uses_crm', label: 'Você utiliza algum sistema ou CRM para controlar clientes?', type: 'single', required: false, options: ['Sim', 'Não'] },
          { key: 'tracks_clients', label: 'Você acompanha clientes ativos e inativos?', type: 'single', required: false, options: ['Sim', 'Parcial', 'Não'] },
        ],
      },
      {
        key: 'growth',
        title: '6. Crescimento',
        questions: [
          { key: 'has_growth_goal', label: 'Existe uma meta clara de crescimento?', type: 'single', required: false, options: ['Sim', 'Não'] },
          { key: 'biggest_challenge', label: 'Se quisesse crescer nos próximos 12 meses, qual seria o maior desafio hoje?', type: 'text', required: false },
        ],
      },
      {
        key: 'final_perception',
        title: '7. Percepção Final',
        questions: [
          { key: 'main_challenge', label: 'O principal desafio da sua empresa está em:', type: 'single', required: false, options: ['Gerar mais oportunidades', 'Melhorar conversão de vendas', 'Posicionamento no mercado', 'Estrutura comercial', 'Não sei exatamente'] },
        ],
      },
    ],
  },

  // ─── Comércio de Alto Valor ──────────────────────────────────────────────────
  commerce: {
    label: 'Comércio de Alto Valor',
    sections: [
      {
        key: 'company',
        title: '1. Sobre a Empresa',
        questions: [
          { key: 'segment', label: 'Segmento', type: 'single', required: false, options: ['Veículos', 'Náutica (lanchas / jetski)', 'Máquinas / equipamentos', 'Imobiliário', 'Outros'] },
          { key: 'operation_format', label: 'Formato de atuação', type: 'single', required: false, options: ['Loja física', 'Loja + digital', 'Representação / vendas externas'] },
          { key: 'market_time', label: 'Tempo de mercado', type: 'single', required: false, options: ['0–2 anos', '3–5 anos', '6–10 anos', 'Mais de 10 anos'] },
        ],
      },
      {
        key: 'clients_and_demand',
        title: '2. Clientes e Demanda',
        questions: [
          { key: 'main_sales_source', label: 'De onde vêm a maior parte das vendas?', type: 'single', required: false, options: ['Indicação', 'Loja física (fluxo)', 'Redes sociais', 'Google / internet', 'Equipe comercial', 'Outros'] },
          { key: 'generates_enough_opportunities', label: 'Você considera que gera oportunidades suficientes?', type: 'single', required: false, options: ['Sim', 'Não', 'Poderia melhorar'] },
          { key: 'converts_interested_clients', label: 'Quando um cliente demonstra interesse, você consegue converter bem?', type: 'single', required: false, options: ['Sim', 'Não', 'Parcial'] },
        ],
      },
      {
        key: 'digital_presence',
        title: '3. Presença Digital e Marketing',
        questions: [
          { key: 'has_presence', label: 'Sua empresa possui:', type: 'single', required: false, options: ['Site', 'Redes sociais', 'Ambos', 'Nenhum'] },
          { key: 'shows_products_and_differentials', label: 'Seus canais mostram claramente os produtos e diferenciais?', type: 'single', required: false, options: ['Sim', 'Não', 'Parcial'] },
          { key: 'generates_real_opportunities', label: 'Sua presença digital gera oportunidades reais de venda?', type: 'single', required: false, options: ['Sim', 'Pouco', 'Não gera'] },
          { key: 'well_positioned', label: 'Você acredita que está bem posicionado frente aos concorrentes?', type: 'single', required: false, options: ['Sim', 'Não', 'Não sei'] },
          { key: 'professional_image', label: 'Quando alguém busca sua empresa, encontra uma imagem forte e profissional?', type: 'single', required: false, options: ['Sim', 'Não', 'Parcial'] },
        ],
      },
      {
        key: 'positioning',
        title: '4. Posicionamento',
        questions: [
          { key: 'products_well_presented', label: 'Seus produtos são bem apresentados e valorizados?', type: 'single', required: false, options: ['Sim', 'Não', 'Parcial'] },
          { key: 'clear_differential', label: 'Seu diferencial está claro para o cliente?', type: 'single', required: false, options: ['Sim', 'Não', 'Parcial'] },
          { key: 'communication', label: 'Sua comunicação é:', type: 'single', required: false, options: ['Clara e atrativa', 'Genérica', 'Confusa'] },
        ],
      },
      {
        key: 'commercial',
        title: '5. Organização e Comercial',
        questions: [
          { key: 'structured_sales_process', label: 'Existe um processo estruturado para atendimento e vendas?', type: 'single', required: false, options: ['Sim', 'Não', 'Parcial'] },
          { key: 'tracks_clients_and_negotiations', label: 'Você registra e acompanha seus clientes e negociações?', type: 'single', required: false, options: ['Sim', 'Parcial', 'Não'] },
          { key: 'uses_crm', label: 'Você utiliza algum sistema ou CRM?', type: 'single', required: false, options: ['Sim', 'Não'] },
          { key: 'has_follow_up_strategy', label: 'Existe estratégia de acompanhamento de clientes interessados?', type: 'single', required: false, options: ['Sim', 'Não'] },
          { key: 'loses_sales_lack_of_follow_up', label: 'Você perde vendas por falta de acompanhamento?', type: 'single', required: false, options: ['Sim', 'Não', 'Não sei'] },
        ],
      },
      {
        key: 'growth',
        title: '6. Crescimento',
        questions: [
          { key: 'has_growth_goal', label: 'Existe uma meta clara de crescimento?', type: 'single', required: false, options: ['Sim', 'Não'] },
          { key: 'biggest_challenge', label: 'Se você quisesse vender mais, qual seria o maior desafio hoje?', type: 'text', required: false },
        ],
      },
      {
        key: 'final_perception',
        title: '7. Percepção Final',
        questions: [
          { key: 'main_challenge', label: 'Você acredita que o principal desafio está em:', type: 'single', required: false, options: ['Gerar mais oportunidades', 'Melhorar conversão de vendas', 'Posicionamento no mercado', 'Organização do processo comercial', 'Não sei exatamente'] },
        ],
      },
    ],
  },

  // ─── Indústria ───────────────────────────────────────────────────────────────
  industry: {
    label: 'Indústria',
    sections: [
      {
        key: 'company',
        title: '1. Sobre a Empresa',
        questions: [
          { key: 'segment', label: 'Segmento industrial', type: 'single', required: false, options: ['Metalúrgica', 'Alimentos', 'Plásticos', 'Equipamentos', 'Agroindústria', 'Outros'] },
          { key: 'employee_count', label: 'Número de colaboradores', type: 'single', required: false, options: ['Até 10', '11 a 50', '51 a 100', '101 a 500', 'Acima de 500'] },
          { key: 'market_time', label: 'Tempo de mercado', type: 'single', required: false, options: ['0–2 anos', '3–5 anos', '6–10 anos', 'Mais de 10 anos'] },
        ],
      },
      {
        key: 'sales_and_demand',
        title: '2. Vendas e Demanda',
        questions: [
          { key: 'main_sales_source', label: 'De onde vem a maior parte das suas vendas?', type: 'single', required: false, options: ['Indicação', 'Equipe comercial', 'Representantes', 'Marketing digital', 'Outros'] },
          { key: 'generates_enough_opportunities', label: 'Sua empresa gera oportunidades suficientes?', type: 'single', required: false, options: ['Sim', 'Não', 'Poderia melhorar'] },
          { key: 'converts_interested_clients', label: 'Quando um cliente demonstra interesse, sua equipe consegue converter bem?', type: 'single', required: false, options: ['Sim', 'Não', 'Parcial'] },
        ],
      },
      {
        key: 'digital_presence',
        title: '3. Presença Digital e Marketing',
        questions: [
          { key: 'has_presence', label: 'Sua empresa possui:', type: 'single', required: false, options: ['Site', 'Redes sociais', 'Ambos', 'Nenhum'] },
          { key: 'clarity_of_what_company_does', label: 'Seu site e redes deixam claro o que sua empresa faz?', type: 'single', required: false, options: ['Sim', 'Não', 'Parcial'] },
          { key: 'marketing_generates_opportunities', label: 'Hoje, seu marketing gera oportunidades reais de negócio?', type: 'single', required: false, options: ['Sim', 'Pouco', 'Não gera'] },
          { key: 'well_positioned_digitally', label: 'Você acredita que sua empresa está bem posicionada digitalmente?', type: 'single', required: false, options: ['Sim', 'Não', 'Não sei'] },
          { key: 'professional_image', label: 'Quando alguém pesquisa sua empresa, encontra uma imagem profissional?', type: 'single', required: false, options: ['Sim', 'Não', 'Parcial'] },
        ],
      },
      {
        key: 'positioning',
        title: '4. Posicionamento',
        questions: [
          { key: 'clear_differential', label: 'Seu diferencial está claro para o mercado?', type: 'single', required: false, options: ['Sim', 'Não', 'Parcial'] },
          { key: 'defined_audience', label: 'Seu público está bem definido?', type: 'single', required: false, options: ['Sim', 'Não', 'Parcial'] },
          { key: 'communication', label: 'Sua comunicação é:', type: 'single', required: false, options: ['Clara e objetiva', 'Genérica', 'Confusa'] },
        ],
      },
      {
        key: 'commercial',
        title: '5. Comercial',
        questions: [
          { key: 'structured_sales_process', label: 'Existe um processo de vendas estruturado?', type: 'single', required: false, options: ['Sim', 'Não', 'Parcial'] },
          { key: 'uses_crm', label: 'Você utiliza algum sistema ou CRM para controlar clientes?', type: 'single', required: false, options: ['Sim', 'Não'] },
          { key: 'tracks_active_inactive', label: 'Você acompanha clientes ativos e inativos?', type: 'single', required: false, options: ['Sim', 'Parcial', 'Não'] },
          { key: 'depends_on_salesperson', label: 'Hoje, suas vendas dependem muito do vendedor?', type: 'single', required: false, options: ['Sim', 'Não', 'Parcial'] },
        ],
      },
      {
        key: 'growth',
        title: '6. Crescimento',
        questions: [
          { key: 'has_growth_goal', label: 'Existe uma meta clara de crescimento?', type: 'single', required: false, options: ['Sim', 'Não'] },
          { key: 'biggest_challenge', label: 'Se você quisesse crescer nos próximos 12 meses, qual seria o maior desafio hoje?', type: 'text', required: false },
        ],
      },
      {
        key: 'final_perception',
        title: '7. Percepção Final',
        questions: [
          { key: 'main_challenge', label: 'Você acredita que o principal desafio da sua empresa está em:', type: 'single', required: false, options: ['Gerar mais demanda', 'Melhorar conversão de vendas', 'Posicionamento no mercado', 'Estrutura comercial', 'Não sei exatamente'] },
        ],
      },
    ],
  },

  // ─── Serviços / Profissionais Liberais ──────────────────────────────────────
  services: {
    label: 'Serviços / Profissionais Liberais',
    sections: [
      {
        key: 'company',
        title: '1. Sobre a Empresa',
        questions: [
          { key: 'area', label: 'Área de atuação', type: 'single', required: false, options: ['Advocacia', 'Contabilidade', 'Engenharia', 'Consultoria', 'Tecnologia / TI', 'Serviços especializados', 'Outros'] },
          { key: 'operation_format', label: 'Formato de atuação', type: 'single', required: false, options: ['Profissional individual', 'Pequena equipe', 'Empresa estruturada'] },
          { key: 'market_time', label: 'Tempo de atuação', type: 'single', required: false, options: ['0–2 anos', '3–5 anos', '6–10 anos', 'Mais de 10 anos'] },
        ],
      },
      {
        key: 'clients_and_demand',
        title: '2. Clientes e Demanda',
        questions: [
          { key: 'main_client_source', label: 'De onde vêm a maior parte dos seus clientes?', type: 'single', required: false, options: ['Indicação', 'Networking', 'Redes sociais', 'Google / internet', 'Prospecção ativa', 'Outros'] },
          { key: 'generates_enough_opportunities', label: 'Você considera que gera oportunidades suficientes?', type: 'single', required: false, options: ['Sim', 'Não', 'Poderia melhorar'] },
          { key: 'converts_interested_clients', label: 'Quando um cliente entra em contato, você consegue converter bem?', type: 'single', required: false, options: ['Sim', 'Não', 'Parcial'] },
        ],
      },
      {
        key: 'digital_presence',
        title: '3. Presença Digital e Marketing',
        questions: [
          { key: 'has_presence', label: 'Você possui:', type: 'single', required: false, options: ['Site', 'Redes sociais', 'Ambos', 'Nenhum'] },
          { key: 'client_understands_services', label: 'Seu cliente entende claramente o que você faz ao ver sua comunicação?', type: 'single', required: false, options: ['Sim', 'Não', 'Parcial'] },
          { key: 'generates_new_clients', label: 'Hoje, sua presença digital gera novos clientes?', type: 'single', required: false, options: ['Sim', 'Pouco', 'Não gera'] },
          { key: 'well_positioned', label: 'Você acredita que está bem posicionado no seu mercado?', type: 'single', required: false, options: ['Sim', 'Não', 'Não sei'] },
          { key: 'professional_image', label: 'Quando alguém busca seu nome ou empresa, encontra uma imagem profissional?', type: 'single', required: false, options: ['Sim', 'Não', 'Parcial'] },
        ],
      },
      {
        key: 'positioning',
        title: '4. Posicionamento',
        questions: [
          { key: 'clear_differential', label: 'Seu diferencial está claro para o cliente?', type: 'single', required: false, options: ['Sim', 'Não', 'Parcial'] },
          { key: 'defined_audience', label: 'Você tem um público bem definido?', type: 'single', required: false, options: ['Sim', 'Não', 'Parcial'] },
          { key: 'communication', label: 'Sua comunicação é:', type: 'single', required: false, options: ['Clara e objetiva', 'Genérica', 'Confusa'] },
        ],
      },
      {
        key: 'commercial',
        title: '5. Organização e Comercial',
        questions: [
          { key: 'structured_process', label: 'Existe um processo estruturado para atender e converter clientes?', type: 'single', required: false, options: ['Sim', 'Não', 'Parcial'] },
          { key: 'tracks_clients_and_negotiations', label: 'Você registra e acompanha seus clientes e negociações?', type: 'single', required: false, options: ['Sim', 'Parcial', 'Não'] },
          { key: 'uses_system_or_tool', label: 'Você utiliza algum sistema ou ferramenta para organização?', type: 'single', required: false, options: ['Sim', 'Não'] },
          { key: 'has_relationship_strategy', label: 'Existe estratégia para manter relacionamento com clientes?', type: 'single', required: false, options: ['Sim', 'Não'] },
          { key: 'depends_on_referral_or_relationship', label: 'Seu resultado depende muito de indicação ou relacionamento pessoal?', type: 'single', required: false, options: ['Sim', 'Não', 'Parcial'] },
        ],
      },
      {
        key: 'growth',
        title: '6. Crescimento',
        questions: [
          { key: 'has_growth_goal', label: 'Existe uma meta clara de crescimento?', type: 'single', required: false, options: ['Sim', 'Não'] },
          { key: 'biggest_challenge', label: 'Se você quisesse crescer nos próximos 12 meses, qual seria o maior desafio hoje?', type: 'text', required: false },
        ],
      },
      {
        key: 'final_perception',
        title: '7. Percepção Final',
        questions: [
          { key: 'main_challenge', label: 'Você acredita que o principal desafio está em:', type: 'single', required: false, options: ['Gerar mais clientes', 'Melhorar conversão de vendas', 'Posicionamento no mercado', 'Organização do processo comercial', 'Não sei exatamente'] },
        ],
      },
    ],
  },

  // ─── Saúde ───────────────────────────────────────────────────────────────────
  health: {
    label: 'Saúde',
    sections: [
      {
        key: 'company',
        title: '1. Sobre a Empresa',
        questions: [
          { key: 'area', label: 'Área de atuação', type: 'single', required: false, options: ['Clínica médica', 'Odontologia', 'Estética', 'Fisioterapia', 'Psicologia', 'Outros'] },
          { key: 'structure_size', label: 'Tamanho da estrutura', type: 'single', required: false, options: ['Atendimento individual', 'Pequena clínica', 'Clínica estruturada', 'Médio porte'] },
          { key: 'market_time', label: 'Tempo de atuação', type: 'single', required: false, options: ['0–2 anos', '3–5 anos', '6–10 anos', 'Mais de 10 anos'] },
        ],
      },
      {
        key: 'patients_and_demand',
        title: '2. Pacientes e Demanda',
        questions: [
          { key: 'main_patient_source', label: 'De onde vem a maior parte dos seus pacientes?', type: 'single', required: false, options: ['Indicação', 'Convênios', 'Redes sociais', 'Google / internet', 'Outros'] },
          { key: 'schedule_status', label: 'Você considera que sua agenda está:', type: 'single', required: false, options: ['Cheia', 'Parcialmente preenchida', 'Com horários ociosos'] },
          { key: 'patient_schedules_easily', label: 'Quando um paciente entra em contato, ele agenda com facilidade?', type: 'single', required: false, options: ['Sim', 'Não', 'Parcial'] },
        ],
      },
      {
        key: 'digital_presence',
        title: '3. Presença Digital e Marketing',
        questions: [
          { key: 'has_presence', label: 'Sua empresa possui:', type: 'single', required: false, options: ['Site', 'Redes sociais', 'Ambos', 'Nenhum'] },
          { key: 'profile_transmits_trust', label: 'Seu perfil transmite confiança e profissionalismo?', type: 'single', required: false, options: ['Sim', 'Não', 'Parcial'] },
          { key: 'patient_understands_services', label: 'Seu paciente entende claramente seus serviços ao ver sua comunicação?', type: 'single', required: false, options: ['Sim', 'Não', 'Parcial'] },
          { key: 'generates_new_patients', label: 'Hoje, sua presença digital gera novos pacientes?', type: 'single', required: false, options: ['Sim', 'Pouco', 'Não gera'] },
        ],
      },
      {
        key: 'positioning',
        title: '4. Posicionamento',
        questions: [
          { key: 'well_positioned', label: 'Você acredita que sua clínica está bem posicionada no mercado?', type: 'single', required: false, options: ['Sim', 'Não', 'Não sei'] },
          { key: 'clear_differential', label: 'Seu diferencial está claro para o paciente?', type: 'single', required: false, options: ['Sim', 'Não', 'Parcial'] },
          { key: 'communication', label: 'Sua comunicação é:', type: 'single', required: false, options: ['Clara', 'Genérica', 'Confusa'] },
        ],
      },
      {
        key: 'organization_and_relationship',
        title: '5. Organização e Relacionamento',
        questions: [
          { key: 'organized_process', label: 'Existe um processo organizado para atendimento e agendamento?', type: 'single', required: false, options: ['Sim', 'Não', 'Parcial'] },
          { key: 'tracks_patient_info', label: 'Você registra e acompanha informações dos pacientes?', type: 'single', required: false, options: ['Sim', 'Parcial', 'Não'] },
          { key: 'tracks_patient_return', label: 'Você acompanha retorno de pacientes?', type: 'single', required: false, options: ['Sim', 'Parcial', 'Não'] },
          { key: 'strategy_to_bring_back', label: 'Existe estratégia para trazer pacientes de volta?', type: 'single', required: false, options: ['Sim', 'Não'] },
          { key: 'uses_system', label: 'Você utiliza algum sistema para organizar atendimentos e contatos?', type: 'single', required: false, options: ['Sim', 'Não'] },
        ],
      },
      {
        key: 'growth',
        title: '6. Crescimento',
        questions: [
          { key: 'has_growth_goal', label: 'Existe uma meta de crescimento para sua clínica?', type: 'single', required: false, options: ['Sim', 'Não'] },
          { key: 'biggest_challenge', label: 'Se você quisesse aumentar o número de pacientes, qual seria o maior desafio hoje?', type: 'text', required: false },
        ],
      },
      {
        key: 'final_perception',
        title: '7. Percepção Final',
        questions: [
          { key: 'main_challenge', label: 'Você acredita que o principal desafio está em:', type: 'single', required: false, options: ['Atrair mais pacientes', 'Melhorar conversão de atendimento', 'Posicionamento no mercado', 'Organização interna', 'Não sei exatamente'] },
        ],
      },
    ],
  },
};

const VALID_FORM_TYPES = Object.keys(FORM_TYPES);

module.exports = { FORM_TYPES, VALID_FORM_TYPES };
