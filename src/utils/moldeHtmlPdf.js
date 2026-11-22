import { MESES_EXTENSO_PT } from './arquivosRelatorio';
import { PAPEL_TIMBRADO_BASE64 } from './papelTimbradoBase64';

const DIAS_SEMANA_PT = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export const dateParaIsoLocal = (dateObj) => {
  const d = dateObj instanceof Date ? dateObj : new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

export const isoParaDateLocal = (dataIso) => {
  if (!dataIso || !dataIso.includes('-')) return new Date();
  const [ano, mes, dia] = dataIso.split('-').map(Number);
  if (!ano || !mes || !dia) return new Date();
  return new Date(ano, mes - 1, dia, 12, 0, 0);
};

export const formatarDataIsoParaBR = (dataIso) => {
  if (!dataIso) return 'Não informado';
  if (dataIso.includes('/')) return dataIso;
  const partes = dataIso.split('-');
  if (partes.length !== 3) return dataIso;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

export const obterDiaSemanaPt = (dataIso) => {
  if (!dataIso || !dataIso.includes('-')) return '-';
  const d = isoParaDateLocal(dataIso);
  return DIAS_SEMANA_PT[d.getDay()] || '-';
};

export const calcularDuracaoMinutos = (horarioInicio, horarioTermino) => {
  if (!horarioInicio || !horarioTermino) return 0;
  const partesIni = String(horarioInicio).split(':').map(Number);
  const partesFim = String(horarioTermino).split(':').map(Number);
  if (partesIni.length < 2 || partesFim.length < 2) return 0;
  if (
    Number.isNaN(partesIni[0]) ||
    Number.isNaN(partesIni[1]) ||
    Number.isNaN(partesFim[0]) ||
    Number.isNaN(partesFim[1])
  ) {
    return 0;
  }

  const totalIni = partesIni[0] * 60 + partesIni[1];
  const totalFim = partesFim[0] * 60 + partesFim[1];
  const diff = totalFim - totalIni;
  return diff > 0 ? diff : 0;
};

export const obterValorPredominante = (sessoes, campo, padrao) => {
  if (!Array.isArray(sessoes) || sessoes.length === 0) return padrao;
  const contagem = {};
  sessoes.forEach((s) => {
    const val = (s?.[campo] || '').trim();
    if (!val) return;
    contagem[val] = (contagem[val] || 0) + 1;
  });

  const entradas = Object.entries(contagem);
  if (entradas.length === 0) return padrao;
  entradas.sort((a, b) => b[1] - a[1]);
  return entradas[0][0];
};

export const calcularResumoDuracao = (sessoes) => {
  if (!Array.isArray(sessoes) || sessoes.length === 0) return 'Não informado';
  const duracoes = sessoes
    .map((s) => calcularDuracaoMinutos(s.horario_inicio, s.horario_termino))
    .filter((m) => m > 0);

  if (duracoes.length === 0) return 'Não informado';

  const unicas = [...new Set(duracoes)];
  if (unicas.length === 1) {
    return `${unicas[0]} minutos`;
  }

  const soma = duracoes.reduce((acc, cur) => acc + cur, 0);
  const media = Math.round(soma / duracoes.length);
  return `${media} minutos`;
};

const extrairMateriaisUnicos = (sessoes) => {
  const vistos = new Set();
  const lista = [];

  (sessoes || []).forEach((sessao) => {
    const bruto = sessao?.material_utilizado || '';
    if (!bruto.trim()) return;

    const itens = bruto
      .split(/[,;\n]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    itens.forEach((item) => {
      const chave = item.toLowerCase();
      if (!vistos.has(chave)) {
        vistos.add(chave);
        const capitalizado = item.charAt(0).toUpperCase() + item.slice(1);
        lista.push(capitalizado);
      }
    });
  });

  return lista;
};

export const gerarTextosIniciaisRelatorio = ({
  paciente,
  perfil,
  sessoes = [],
  metas = [],
  passos = [],
  dataInicio,
  dataFim,
}) => {
  const nomePaciente = paciente?.nome || 'o(a) paciente';
  const especialidade = perfil?.especialidade || 'Psicopedagogia';
  const modalidade = obterValorPredominante(sessoes, 'modalidade', 'Presencial');
  const forma = obterValorPredominante(sessoes, 'forma', 'Individual');
  const duracaoTexto = calcularResumoDuracao(sessoes);
  const qtdSessoes = sessoes.length;
  const periodoTexto = `${formatarDataIsoParaBR(dataInicio)} a ${formatarDataIsoParaBR(dataFim)}`;

  // 1. Descrição do atendimento
  const descricaoAtendimento =
    qtdSessoes > 0
      ? `Durante os atendimentos de ${especialidade} realizados no período de ${periodoTexto}, foram desenvolvidas atividades lúdicas, pedagógicas e direcionadas para ${nomePaciente}, na modalidade ${modalidade.toLowerCase()} e de forma ${forma.toLowerCase()}, totalizando ${qtdSessoes} ${qtdSessoes === 1 ? 'sessão realizada' : 'sessões realizadas'} com duração de ${duracaoTexto}.\nAs intervenções foram conduzidas respeitando as características individuais e o ritmo de aprendizagem do(a) paciente, com o propósito de ampliar suas possibilidades de aprendizagem e favorecer seu desenvolvimento global.`
      : `Durante o acompanhamento em ${especialidade} referente ao período de ${periodoTexto}, foram planejadas atividades lúdicas e pedagógicas voltadas ao desenvolvimento de ${nomePaciente}, em formato ${modalidade.toLowerCase()} e ${forma.toLowerCase()}.`;

  // 2. Objetivos terapêuticos
  let objetivosTerapeuticos = '';
  if (metas.length > 0) {
    const linhasObjetivos = [];
    metas.forEach((meta) => {
      const passosDaMeta = passos.filter((p) => p.meta_id === meta.id);
      const statusMeta = meta.alcancada === 1 ? ' (Alcançada)' : '';
      linhasObjetivos.push(`- ${meta.descricao}${statusMeta}`);
      passosDaMeta.forEach((passo) => {
        const marcador = passo.concluido === 1 ? ' (Concluído)' : '';
        linhasObjetivos.push(`- ${passo.titulo}${marcador}`);
      });
    });
    objetivosTerapeuticos = linhasObjetivos.join('\n');
  } else {
    objetivosTerapeuticos =
      '- Estimular a atenção, a concentração e o raciocínio lógico por meio de jogos e atividades lúdicas.\n- Favorecer o desenvolvimento cognitivo, perceptivo, motor e das habilidades pré-acadêmicas.\n- Promover maior autonomia na realização das propostas terapêuticas.';
  }

  // 3. Procedimentos, técnicas e recursos utilizados
  const materiaisUnicos = extrairMateriaisUnicos(sessoes);
  let procedimentosRecursos = '';
  if (materiaisUnicos.length > 0) {
    const listaMateriais = materiaisUnicos.map((m) => m.toLowerCase()).join(', ');
    procedimentosRecursos = `Foram utilizadas estratégias de intervenção por meio de atividades lúdicas e pedagógicas direcionadas à estimulação das habilidades trabalhadas.\nComo recursos, foram utilizados: ${listaMateriais}.\nOs recursos foram aplicados de maneira lúdica e direcionada, com instruções e modelos visuais conforme a proposta de cada atividade, buscando favorecer a participação e o desenvolvimento do(a) paciente.`;
  } else {
    procedimentosRecursos =
      'Foram utilizadas estratégias de intervenção por meio de atividades lúdicas, pedagógicas e sensoriais, aplicadas de maneira direcionada e adaptadas às necessidades do(a) paciente.';
  }

  // 4. Evolução do paciente
  const blocosEvolucao = [];
  const passosConcluidos = passos.filter((p) => p.concluido === 1);
  if (passosConcluidos.length > 0) {
    blocosEvolucao.push(
      'Etapas concluídas na trilha de aprendizagem:\n' +
        passosConcluidos
          .map((p) => `- ${p.titulo}${p.meta_titulo ? ` (${p.meta_titulo})` : ''}`)
          .join('\n')
    );
  }

  const registrosDiarios = sessoes
    .filter((s) => s.relatorio_diario && s.relatorio_diario.trim())
    .map((s) => `${formatarDataIsoParaBR(s.data)} - ${s.relatorio_diario.trim()}`);

  if (registrosDiarios.length > 0) {
    blocosEvolucao.push(registrosDiarios.join('\n'));
  }

  const evolucaoPaciente =
    blocosEvolucao.length > 0
      ? blocosEvolucao.join('\n')
      : `Ao longo dos atendimentos realizados no período de ${periodoTexto}, ${nomePaciente} apresentou boa aceitação das atividades propostas, demonstrando disponibilidade para participar das intervenções e respondendo positivamente às orientações fornecidas.`;

  // 5. Planejamento terapêutico
  const passosPendentes = passos.filter((p) => p.concluido !== 1);
  const metasPendentesSemPassos = metas.filter(
    (m) => m.alcancada !== 1 && !passos.some((p) => p.meta_id === m.id)
  );

  const itensPendentes = [
    ...passosPendentes.map(
      (p) => `- ${p.titulo}${p.meta_titulo ? ` (${p.meta_titulo})` : ''}`
    ),
    ...metasPendentesSemPassos.map((m) => `- ${m.descricao}`),
  ];

  const planejamentoTerapeutico =
    itensPendentes.length > 0
      ? 'Dar continuidade às intervenções terapêuticas, priorizando as seguintes etapas e objetivos:\n' +
        itensPendentes.join('\n') +
        '\nSerão mantidas estratégias para favorecer a autonomia, a compreensão de comandos e o avanço progressivo respeitando o ritmo de aprendizagem do(a) paciente.'
      : 'Dar continuidade às intervenções terapêuticas, priorizando a consolidação das habilidades trabalhadas, a autonomia e a permanência nas atividades, respeitando o ritmo de aprendizagem e as particularidades do(a) paciente.';

  // 6. Conclusão
  const conclusao = `Durante o período avaliado, ${nomePaciente} apresentou boa aceitação das intervenções em ${especialidade}, realizando as atividades propostas com engajamento.\nDessa forma, recomenda-se a continuidade do acompanhamento, com propostas individualizadas e recursos lúdicos e pedagógicos que favoreçam o desenvolvimento das habilidades em construção, respeitando o ritmo de aprendizagem e as necessidades do(a) paciente.`;

  return {
    descricaoAtendimento,
    objetivosTerapeuticos,
    procedimentosRecursos,
    evolucaoPaciente,
    planejamentoTerapeutico,
    conclusao,
  };
};

const escapeHtml = (texto) => {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const formatarTextoParaHtml = (texto) => {
  const limpo = (texto || '').trim();
  if (!limpo) {
    return '<p>Não informado.</p>';
  }

  const linhas = limpo.split(/\r?\n/);
  const htmlPartes = [];

  linhas.forEach((linhaOriginal) => {
    const linha = linhaOriginal.trim();
    if (!linha) return;

    const matchItem = linha.match(/^([-•*])\s+(.*)$/);
    if (matchItem) {
      htmlPartes.push(`<p class="item-lista">- ${escapeHtml(matchItem[2])}</p>`);
    } else {
      htmlPartes.push(`<p>${escapeHtml(linha)}</p>`);
    }
  });

  return htmlPartes.join('\n');
};

export const gerarHtmlRelatorioPdf = ({
  perfil = {},
  paciente = {},
  sessoes = [],
  dataInicio,
  dataFim,
  textos = {},
  dataEmissao = new Date(),
}) => {
  const especialidade = (perfil.especialidade || 'Psicopedagogia').trim();
  const modalidadePred = obterValorPredominante(sessoes, 'modalidade', 'Presencial');
  const formaPred = obterValorPredominante(sessoes, 'forma', 'Individual');
  const duracaoResumo = calcularResumoDuracao(sessoes);
  const periodoFormatado = `${formatarDataIsoParaBR(dataInicio)} a ${formatarDataIsoParaBR(dataFim)}`;

  // Data de encerramento por extenso: "Barueri, 23 de outubro de 2026"
  const diaEmissao = dataEmissao.getDate();
  const mesEmissao = MESES_EXTENSO_PT[dataEmissao.getMonth()];
  const anoEmissao = dataEmissao.getFullYear();
  const cidade = (perfil.cidade || '').trim();
  const dataLocalExtenso = cidade
    ? `${escapeHtml(cidade)}, ${diaEmissao} de ${mesEmissao} de ${anoEmissao}`
    : `${diaEmissao} de ${mesEmissao} de ${anoEmissao}`;

  // Linhas da tabela da seção 7 (exatamente como no modelo)
  const linhasTabelaHtml =
    sessoes.length > 0
      ? sessoes
          .map((sessao) => {
            const dataBr = formatarDataIsoParaBR(sessao.data);
            const diaSemana = obterDiaSemanaPt(sessao.data);
            const inicio = sessao.horario_inicio || '-';
            const termino = sessao.horario_termino || '-';
            const duracao = calcularDuracaoMinutos(
              sessao.horario_inicio,
              sessao.horario_termino
            );
            const duracaoStr = duracao > 0 ? String(duracao) : '-';
            const modForma = `${sessao.modalidade || 'Presencial'} / ${sessao.forma || 'Individual'}`;
            const atividade =
              (sessao.atividade_realizada && sessao.atividade_realizada.trim()) ||
              (sessao.objetivo_titulo && sessao.objetivo_titulo.trim()) ||
              '-';

            return `
              <tr>
                <td class="col-center nowrap">${escapeHtml(dataBr)}</td>
                <td class="col-center nowrap">${escapeHtml(diaSemana)}</td>
                <td class="col-center nowrap">${escapeHtml(inicio)}</td>
                <td class="col-center nowrap">${escapeHtml(termino)}</td>
                <td class="col-center nowrap">${escapeHtml(duracaoStr)}</td>
                <td class="col-center nowrap">${escapeHtml(modForma)}</td>
                <td>${escapeHtml(atividade)}</td>
              </tr>
            `;
          })
          .join('')
      : `
        <tr>
          <td colspan="7" class="col-center">Nenhuma sessão realizada registrada neste período.</td>
        </tr>
      `;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RELATÓRIO DE EVOLUÇÃO - ${escapeHtml(especialidade.toUpperCase())}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }

    * {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      background: transparent;
      color: #000000;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10.5pt;
      line-height: 1.42;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Imagem do papel timbrado cobrindo 100% da página A4 em todas as folhas */
    .papel-timbrado-bg {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
      pointer-events: none;
    }

    /* Tabela estrutural para repetir a área livre do cabeçalho e rodapé em TODAS as páginas */
    table.layout-pagina {
      width: 100%;
      border-collapse: collapse;
      border: none;
      background: transparent;
    }

    table.layout-pagina > thead {
      display: table-header-group;
    }

    table.layout-pagina > tfoot {
      display: table-footer-group;
    }

    table.layout-pagina > thead > tr > td,
    table.layout-pagina > tfoot > tr > td,
    table.layout-pagina > tbody > tr > td {
      border: none;
      padding: 0;
      background: transparent;
    }

    .espaco-cabecalho {
      height: 39mm;
    }

    .espaco-rodape {
      height: 33mm;
    }

    .conteudo-pagina {
      padding: 0 18mm !important;
      background: transparent;
    }

    .titulo-documento {
      font-size: 11.5pt;
      font-weight: bold;
      color: #000000;
      text-align: left;
      text-transform: uppercase;
      margin: 0 0 8pt 0;
    }

    .dados-iniciais {
      margin: 0 0 10pt 0;
      font-size: 10.5pt;
      line-height: 1.48;
      color: #000000;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .dados-iniciais p {
      margin: 0 0 2pt 0;
      text-align: left;
    }

    .espaco-campo {
      display: inline-block;
      width: 10pt;
    }

    .secao {
      margin-bottom: 8pt;
    }

    .secao-titulo {
      font-size: 10.5pt;
      font-weight: bold;
      color: #000000;
      margin: 8pt 0 3pt 0;
      break-after: avoid;
      page-break-after: avoid;
    }

    .secao-conteudo p {
      margin: 0 0 4pt 0;
      text-align: justify;
      color: #000000;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .secao-conteudo p.item-lista {
      margin: 0 0 3pt 0;
      text-align: justify;
      color: #000000;
    }

    table.tabela-sessoes {
      width: 100%;
      border-collapse: collapse;
      margin-top: 5pt;
      font-size: 9pt;
      line-height: 1.32;
      color: #000000;
      background: transparent;
    }

    table.tabela-sessoes thead {
      display: table-header-group;
    }

    table.tabela-sessoes tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    table.tabela-sessoes th {
      font-weight: bold;
      color: #000000;
      background: transparent;
      border: 1px solid #000000;
      padding: 4pt 4pt;
      text-align: center;
      vertical-align: middle;
    }

    table.tabela-sessoes td {
      color: #000000;
      background: transparent;
      border: 1px solid #000000;
      padding: 4pt 4pt;
      vertical-align: top;
      text-align: left;
    }

    .col-center {
      text-align: center !important;
    }

    .nowrap {
      white-space: nowrap;
    }

    .encerramento-box {
      margin-top: 14pt;
      color: #000000;
      font-size: 10.5pt;
      line-height: 1.5;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .encerramento-box p {
      margin: 0 0 4pt 0;
      text-align: left;
    }
  </style>
</head>
<body>
  <img src="${PAPEL_TIMBRADO_BASE64}" class="papel-timbrado-bg" alt="" />

  <table class="layout-pagina">
    <thead>
      <tr>
        <td><div class="espaco-cabecalho"></div></td>
      </tr>
    </thead>
    <tfoot>
      <tr>
        <td><div class="espaco-rodape"></div></td>
      </tr>
    </tfoot>
    <tbody>
      <tr>
        <td class="conteudo-pagina">
          <h1 class="titulo-documento">RELATÓRIO DE EVOLUÇÃO - ${escapeHtml(especialidade.toUpperCase())}</h1>

          <div class="dados-iniciais">
            <p>
              <strong>Paciente:</strong> ${escapeHtml(paciente.nome || 'Não informado')}<span class="espaco-campo"></span><strong>Data de nascimento:</strong> ${escapeHtml(paciente.data_nascimento || 'Não informado')}
            </p>
            <p>
              <strong>Responsável:</strong> ${escapeHtml(paciente.responsavel || 'Não informado')}
            </p>
            <p>
              <strong>Profissional:</strong> ${escapeHtml(perfil.nome || 'Não informado')}<span class="espaco-campo"></span><strong>CPF profissional:</strong> ${escapeHtml(perfil.cpf || 'Não informado')}
            </p>
            <p>
              <strong>Telefone profissional:</strong> ${escapeHtml(perfil.telefone || 'Não informado')}<span class="espaco-campo"></span><strong>E-mail profissional:</strong> ${escapeHtml(perfil.email || 'Não informado')}
            </p>
            <p>
              <strong>Período:</strong> ${escapeHtml(periodoFormatado)}<span class="espaco-campo"></span><strong>Forma:</strong> ${escapeHtml(formaPred)}<span class="espaco-campo"></span><strong>Modalidade:</strong> ${escapeHtml(modalidadePred)}<span class="espaco-campo"></span><strong>Duração:</strong> ${escapeHtml(duracaoResumo)}
            </p>
            <p>
              <strong>Quantidade de sessões no período:</strong> ${sessoes.length}
            </p>
          </div>

          <section class="secao">
            <h2 class="secao-titulo">1. Descrição do atendimento</h2>
            <div class="secao-conteudo">
              ${formatarTextoParaHtml(textos.descricaoAtendimento)}
            </div>
          </section>

          <section class="secao">
            <h2 class="secao-titulo">2. Objetivos terapêuticos</h2>
            <div class="secao-conteudo">
              ${formatarTextoParaHtml(textos.objetivosTerapeuticos)}
            </div>
          </section>

          <section class="secao">
            <h2 class="secao-titulo">3. Procedimentos, técnicas e recursos utilizados</h2>
            <div class="secao-conteudo">
              ${formatarTextoParaHtml(textos.procedimentosRecursos)}
            </div>
          </section>

          <section class="secao">
            <h2 class="secao-titulo">4. Evolução do paciente</h2>
            <div class="secao-conteudo">
              ${formatarTextoParaHtml(textos.evolucaoPaciente)}
            </div>
          </section>

          <section class="secao">
            <h2 class="secao-titulo">5. Planejamento terapêutico</h2>
            <div class="secao-conteudo">
              ${formatarTextoParaHtml(textos.planejamentoTerapeutico)}
            </div>
          </section>

          <section class="secao">
            <h2 class="secao-titulo">6. Conclusão</h2>
            <div class="secao-conteudo">
              ${formatarTextoParaHtml(textos.conclusao)}
            </div>
          </section>

          <section class="secao">
            <h2 class="secao-titulo">7. Demonstrativo detalhado das sessões</h2>
            <table class="tabela-sessoes">
              <thead>
                <tr>
                  <th style="width: 11%;">Data</th>
                  <th style="width: 14%;">Dia da semana</th>
                  <th style="width: 8%;">Início</th>
                  <th style="width: 9%;">Término</th>
                  <th style="width: 10%;">Duração (min)</th>
                  <th style="width: 16%;">Modalidade/Forma</th>
                  <th style="width: 32%;">Técnica ou atividade realizada</th>
                </tr>
              </thead>
              <tbody>
                ${linhasTabelaHtml}
              </tbody>
            </table>
          </section>

          <div class="encerramento-box">
            <p>${dataLocalExtenso}</p>
            <p>
              <strong>Profissional:</strong> ${escapeHtml(perfil.nome || 'Não informado')}<span class="espaco-campo"></span><strong>CPF profissional:</strong> ${escapeHtml(perfil.cpf || 'Não informado')}
            </p>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;
};
