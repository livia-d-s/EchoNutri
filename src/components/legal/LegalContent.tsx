// EchoNutri legal pages — Termos de Uso + Política de Privacidade.
// Single source of truth, used by the overlay component and (future)
// /termos and /privacidade routes if we ever add a router.
//
// Maintainer note: dates/contact/CNPJ live as constants up top so the
// nutri (or her lawyer) can update them in one place after the legal
// review without hunting through copy.

import React from 'react';

// ============================================================
// Editable metadata — keep at the top so the legal review is easy.
// ============================================================
export const LEGAL_META = {
  productName: 'EchoNutri',
  legalEntity: 'Lívia da Silva — MEI · CNPJ 63.383.704/0001-00',
  contactEmail: 'contato@echonutri.com.br',
  jurisdiction: 'Brasil',
  effectiveDate: '01/07/2026',
  lastUpdate: '12/05/2026',
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-md font-semibold text-ink-primary mt-6 mb-2">{children}</h2>
);

const Paragraph: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-sm text-ink-primary leading-relaxed mb-3">{children}</p>
);

const Bullets: React.FC<{ items: React.ReactNode[] }> = ({ items }) => (
  <ul className="space-y-1.5 mb-3 ml-4">
    {items.map((item, i) => (
      <li key={i} className="text-sm text-ink-primary leading-relaxed list-disc list-outside">{item}</li>
    ))}
  </ul>
);

// ============================================================
// Termos de Uso
// ============================================================
export const TermsOfService: React.FC = () => (
  <article>
    <div className="text-2xs text-ink-tertiary uppercase tracking-[0.1em] font-semibold mb-2">
      Vigência: {LEGAL_META.effectiveDate} · Última atualização: {LEGAL_META.lastUpdate}
    </div>
    <h1 className="text-2xl font-bold text-ink-primary tracking-tight mb-4">Termos de Uso</h1>
    <Paragraph>
      Estes Termos regem o uso da plataforma {LEGAL_META.productName}, operada por {LEGAL_META.legalEntity} ("operadora"),
      voltada exclusivamente a profissionais de nutrição com CRN ativo ("nutricionista", "usuária", "você").
      Ao criar uma conta, você declara que leu, compreendeu e aceita estes Termos e a Política de Privacidade.
    </Paragraph>

    <SectionTitle>1. Objeto do serviço</SectionTitle>
    <Paragraph>
      O {LEGAL_META.productName} é um sistema de inteligência clínica que apoia a nutricionista em:
    </Paragraph>
    <Bullets items={[
      'transcrição de consultas (gravação ao vivo ou upload de áudio/vídeo);',
      'geração de avaliação clínica, conduta nutricional e prescrição alimentar a partir da transcrição;',
      'organização do histórico clínico de pacientes;',
      'geração de documentos (pedido de exames, conduta, encaminhamento, prescrição) em PDF.',
    ]} />
    <Paragraph>
      O serviço é uma <strong>ferramenta de apoio à decisão clínica</strong>. A responsabilidade técnica
      pelo atendimento, pelas prescrições e pelas condutas permanece integralmente com a nutricionista
      titular do CRN. O {LEGAL_META.productName} não substitui o julgamento profissional.
    </Paragraph>

    <SectionTitle>2. Cadastro e elegibilidade</SectionTitle>
    <Paragraph>
      Para utilizar o serviço, você deve ser nutricionista com CRN ativo, maior de 18 anos, capaz civilmente,
      e fornecer informações cadastrais verdadeiras. A operadora pode suspender ou encerrar contas que
      apresentem dados falsos, fraude ou uso fora do escopo profissional.
    </Paragraph>

    <SectionTitle>3. Responsabilidade sobre dados das pacientes</SectionTitle>
    <Paragraph>
      Você é a <strong>controladora dos dados</strong> das suas pacientes nos termos da LGPD. A operadora
      atua como <strong>operadora</strong> (processador), tratando os dados conforme suas instruções e estes Termos.
      Cabe a você obter o consentimento ou base legal adequada das pacientes antes de registrar consultas
      ou anexar documentos com dados pessoais sensíveis.
    </Paragraph>
    <Paragraph>
      Você se compromete a:
    </Paragraph>
    <Bullets items={[
      'informar às suas pacientes sobre o uso da plataforma para registro e análise da consulta;',
      'manter sigilo profissional sobre os dados acessados via plataforma;',
      'não compartilhar credenciais de acesso;',
      'não fazer upload de áudio/vídeo de pessoas que não consentiram com a gravação.',
    ]} />

    <SectionTitle>4. Limitação de responsabilidade da IA</SectionTitle>
    <Paragraph>
      As análises, prescrições, exames sugeridos e estimativas nutricionais geradas pela inteligência artificial
      são <strong>sugestões de apoio</strong> e podem conter imprecisões. Toda saída da IA deve ser revisada
      criticamente pela nutricionista antes de ser entregue à paciente ou usada para qualquer decisão clínica.
      A operadora não se responsabiliza por decisões tomadas sem essa revisão.
    </Paragraph>
    <Paragraph>
      Os valores nutricionais (kcal, macros) são estimativas aproximadas com base em referências TBCA/TACO
      interpretadas por IA. Não substituem cálculo nutricional formal quando exigido por protocolos clínicos
      específicos.
    </Paragraph>

    <SectionTitle>5. Assinatura, pagamento e cancelamento</SectionTitle>
    <Paragraph>
      O serviço é oferecido por assinatura recorrente. O valor, periodicidade e forma de pagamento são informados
      no momento da contratação. O cancelamento pode ser feito a qualquer momento pela própria conta e tem efeito
      ao final do ciclo já pago — não há reembolso proporcional do período em curso.
    </Paragraph>
    <Paragraph>
      Após o cancelamento, seus dados ficam disponíveis para reativação por <strong>30 dias</strong>.
      Após esse prazo, são excluídos definitivamente, conforme nossa Política de Privacidade.
    </Paragraph>

    <SectionTitle>6. Propriedade intelectual</SectionTitle>
    <Paragraph>
      O software, marca, identidade visual e código-fonte do {LEGAL_META.productName} são de propriedade da
      operadora. O conteúdo gerado pela nutricionista no uso do serviço (consultas, prescrições, observações)
      é de propriedade dela. A operadora não usa o conteúdo das pacientes para treinar modelos de IA.
    </Paragraph>

    <SectionTitle>7. Alterações nos Termos</SectionTitle>
    <Paragraph>
      Estes Termos podem ser atualizados. Alterações materiais serão comunicadas com 30 dias de antecedência
      por e-mail e/ou no próprio sistema. O uso continuado após a vigência da nova versão configura aceitação.
    </Paragraph>

    <SectionTitle>8. Foro</SectionTitle>
    <Paragraph>
      Estes Termos são regidos pelas leis do {LEGAL_META.jurisdiction}. Fica eleito o foro da comarca da
      sede da operadora para dirimir qualquer questão, com renúncia a qualquer outro por mais privilegiado que seja.
    </Paragraph>

    <SectionTitle>9. Contato</SectionTitle>
    <Paragraph>
      Dúvidas sobre estes Termos: <a href={`mailto:${LEGAL_META.contactEmail}`} className="text-brand-700 hover:text-brand-900 font-medium underline underline-offset-2">{LEGAL_META.contactEmail}</a>.
    </Paragraph>
  </article>
);

// ============================================================
// Política de Privacidade
// ============================================================
export const PrivacyPolicy: React.FC = () => (
  <article>
    <div className="text-2xs text-ink-tertiary uppercase tracking-[0.1em] font-semibold mb-2">
      Vigência: {LEGAL_META.effectiveDate} · Última atualização: {LEGAL_META.lastUpdate}
    </div>
    <h1 className="text-2xl font-bold text-ink-primary tracking-tight mb-4">Política de Privacidade</h1>
    <Paragraph>
      Esta Política descreve como o {LEGAL_META.productName} ("nós", "operadora", {LEGAL_META.legalEntity})
      coleta, usa, armazena e protege dados pessoais, em conformidade com a Lei nº 13.709/2018 (LGPD).
    </Paragraph>

    <SectionTitle>1. Papéis no tratamento (LGPD)</SectionTitle>
    <Bullets items={[
      <><strong>Nutricionista usuária</strong>: controladora dos dados das suas pacientes. Define a finalidade e os meios do tratamento dentro da plataforma.</>,
      <><strong>EchoNutri (operadora)</strong>: processadora. Trata os dados conforme as instruções da controladora e os termos contratuais.</>,
      <><strong>Paciente final</strong>: titular dos dados pessoais cuja consulta foi registrada na plataforma.</>,
    ]} />

    <SectionTitle>2. Quais dados coletamos</SectionTitle>
    <Paragraph><strong>Da nutricionista usuária:</strong></Paragraph>
    <Bullets items={[
      'nome, e-mail profissional, CRN, especialidade, foto de perfil opcional;',
      'preferências de uso (tom de análise, identidade visual de PDFs);',
      'dados de autenticação (criptografados via Firebase Authentication).',
    ]} />
    <Paragraph><strong>Das pacientes (inseridos pela nutricionista):</strong></Paragraph>
    <Bullets items={[
      'nome, data de nascimento, peso, altura, composição corporal, restrições alimentares, objetivos;',
      'transcrições de consultas, observações, marcadores clínicos;',
      'exames laboratoriais e prescrições anexadas em PDF (texto extraído).',
    ]} />
    <Paragraph><strong>Dados técnicos:</strong></Paragraph>
    <Bullets items={[
      'logs de acesso e uso da API para segurança e fins operacionais (IP, timestamp, ação);',
      'armazenamento local no navegador (localStorage) para cache de sessão — não usamos cookies de tracking.',
    ]} />

    <SectionTitle>3. Bases legais (art. 7º e 11 da LGPD)</SectionTitle>
    <Bullets items={[
      <><strong>Execução de contrato</strong>: para prover o serviço de assinatura à nutricionista.</>,
      <><strong>Consentimento explícito</strong>: marcado pela nutricionista no momento do cadastro, cobrindo o uso da plataforma e o tratamento de dados dela.</>,
      <><strong>Cumprimento de obrigação legal</strong>: emissão de nota fiscal, retenção tributária.</>,
      <><strong>Legítimo interesse</strong>: para segurança, prevenção de fraude e melhoria do serviço — sempre balanceado com os direitos do titular.</>,
    ]} />
    <Paragraph>
      O tratamento de dados de pacientes é realizado sob a base legal de <strong>execução do contrato profissional</strong>
      entre nutricionista e paciente, com a EchoNutri atuando como operadora a serviço da controladora.
    </Paragraph>

    <SectionTitle>4. Como usamos seus dados</SectionTitle>
    <Bullets items={[
      'prover as funções da plataforma (gravação, análise, prescrição, PDFs);',
      'autenticar e autorizar acesso à sua conta;',
      'enviar comunicações operacionais (alertas, mudanças de termos);',
      'cobrar a assinatura e emitir nota fiscal;',
      'melhorar a experiência via análise agregada e anonimizada de uso (nunca conteúdo de paciente).',
    ]} />
    <Paragraph>
      <strong>Não usamos conteúdo de consultas, prescrições ou dados de pacientes para treinar modelos de IA.</strong>
      As chamadas para o Gemini são feitas via API com a opção de retenção zero ativa quando disponível.
    </Paragraph>

    <SectionTitle>5. Compartilhamento com terceiros (subprocessadores)</SectionTitle>
    <Paragraph>
      Para operar o serviço, contamos com prestadores que processam dados em nosso nome:
    </Paragraph>
    <Bullets items={[
      <><strong>Google LLC — Firebase Authentication + Firestore</strong>: autenticação e armazenamento de dados (servidores Google Cloud).</>,
      <><strong>Google LLC — Gemini API</strong>: análise de transcrições e geração de prescrição. Processamento sem retenção de conteúdo.</>,
      <><strong>Vercel Inc.</strong>: hospedagem da aplicação web frontend.</>,
      <><strong>Render Services Inc.</strong>: hospedagem do servidor backend de API.</>,
      'Provedor de pagamentos: a definir antes do lançamento (Pagar.me ou Stripe BR) — processará apenas dados de pagamento da nutricionista, nunca dados de pacientes.',
      'Provedor de emissão de nota fiscal: a definir — processará apenas dados fiscais da assinatura.',
    ]} />
    <Paragraph>
      Não vendemos, alugamos ou compartilhamos seus dados para fins de publicidade.
    </Paragraph>

    <SectionTitle>6. Onde os dados ficam armazenados</SectionTitle>
    <Paragraph>
      Os dados ficam armazenados em data centers do Google Cloud, com replicação em múltiplas regiões.
      A LGPD permite transferência internacional quando o país de destino oferece nível adequado de proteção
      ou quando há garantias contratuais — o que se aplica aos nossos subprocessadores.
    </Paragraph>

    <SectionTitle>7. Quanto tempo guardamos</SectionTitle>
    <Bullets items={[
      'Conta ativa: pelo tempo de uso, com backups operacionais regulares.',
      'Após cancelamento: 30 dias de retenção para permitir reativação. Após esse prazo, todos os dados de conta e pacientes são excluídos definitivamente.',
      'Dados fiscais (notas, registros de cobrança): mantidos pelo prazo legal de retenção tributária (até 5 anos).',
      'Logs de acesso: até 12 meses para auditoria e segurança.',
    ]} />

    <SectionTitle>8. Seus direitos (art. 18 da LGPD)</SectionTitle>
    <Paragraph>Você (titular) pode, a qualquer momento, solicitar:</Paragraph>
    <Bullets items={[
      'confirmação de que tratamos seus dados;',
      'acesso aos seus dados (exportação em formato legível);',
      'correção de dados incompletos, inexatos ou desatualizados;',
      'anonimização, bloqueio ou eliminação de dados desnecessários;',
      'portabilidade dos dados a outro fornecedor;',
      'eliminação dos dados tratados com base no consentimento;',
      'informações sobre com quem compartilhamos seus dados;',
      'revogação do consentimento.',
    ]} />
    <Paragraph>
      Para nutricionistas usuárias, o app oferece exportação de dados e exclusão de conta diretamente no perfil.
      Para pacientes, os direitos devem ser exercidos junto à nutricionista responsável pelo registro;
      a EchoNutri (operadora) executará as instruções recebidas da controladora.
    </Paragraph>

    <SectionTitle>9. Segurança</SectionTitle>
    <Bullets items={[
      'transporte seguro (HTTPS/TLS) em todas as comunicações;',
      'autenticação via Firebase com persistência local criptografada;',
      'controle de acesso por escopo de usuário no Firestore (cada nutri vê apenas os próprios dados);',
      'rate-limiting nas APIs para prevenir abuso;',
      'monitoramento de incidentes — comunicação à ANPD em até 72h em caso de incidente que represente risco.',
    ]} />

    <SectionTitle>10. Encarregado de dados (DPO)</SectionTitle>
    <Paragraph>
      Encarregada: <strong>Lívia da Silva</strong>.<br />
      Contato: <a href={`mailto:${LEGAL_META.contactEmail}`} className="text-brand-700 hover:text-brand-900 font-medium underline underline-offset-2">{LEGAL_META.contactEmail}</a>.
    </Paragraph>

    <SectionTitle>11. Cookies e armazenamento local</SectionTitle>
    <Paragraph>
      Não utilizamos cookies de terceiros para tracking ou publicidade. Usamos <strong>localStorage</strong> do
      navegador para manter sua sessão ativa e armazenar cache da sua conta (perfil, lista de pacientes recente)
      — esses dados ficam no seu próprio dispositivo e são sincronizados com o Firestore. Limpar o navegador
      remove o cache local; os dados na nuvem permanecem.
    </Paragraph>

    <SectionTitle>12. Alterações nesta Política</SectionTitle>
    <Paragraph>
      Atualizações materiais serão comunicadas com 30 dias de antecedência. A data da última atualização
      aparece no topo desta Política.
    </Paragraph>

    <SectionTitle>13. Reclamações</SectionTitle>
    <Paragraph>
      Você pode encaminhar reclamações sobre o tratamento de dados pessoais à <strong>ANPD</strong> (Autoridade
      Nacional de Proteção de Dados) por meio do site <a href="https://www.gov.br/anpd/" target="_blank" rel="noreferrer" className="text-brand-700 hover:text-brand-900 font-medium underline underline-offset-2">gov.br/anpd</a>.
    </Paragraph>
  </article>
);
