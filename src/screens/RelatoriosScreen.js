import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import { Ionicons } from '@expo/vector-icons';
import {
  buscarPerfilProfissional,
  salvarPastaRelatorios,
  listarPacientes,
  buscarPacientePorId,
  buscarMetasPaciente,
  buscarTodosPassosPaciente,
  listarSessoesPorPeriodo,
  registrarRelatorioGerado,
  listarRelatoriosGerados,
  excluirRelatorioGerado,
} from '../database/db';
import {
  selecionarPastaRelatorios,
  formatarNomePasta,
  gerarNomeArquivoUnico,
  salvarPdfRelatorio,
  abrirRelatorioPdf,
  compartilharRelatorioPdf,
  excluirArquivoRelatorio,
} from '../utils/arquivosRelatorio';
import {
  dateParaIsoLocal,
  isoParaDateLocal,
  formatarDataIsoParaBR,
  obterValorPredominante,
  calcularResumoDuracao,
  gerarTextosIniciaisRelatorio,
  gerarHtmlRelatorioPdf,
} from '../utils/moldeHtmlPdf';

const obterInicioMesAtualIso = () => {
  const hoje = new Date();
  return dateParaIsoLocal(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
};

export default function RelatoriosScreen() {
  const insets = useSafeAreaInsets();

  const [pastaRelatorios, setPastaRelatorios] = useState('');
  const [relatorios, setRelatorios] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [abrindoId, setAbrindoId] = useState(null);
  const [compartilhandoId, setCompartilhandoId] = useState(null);

  // Estado do modal de criação
  const [modalVisivel, setModalVisivel] = useState(false);
  const [pacienteId, setPacienteId] = useState(null);
  const [dataInicio, setDataInicio] = useState(obterInicioMesAtualIso());
  const [dataFim, setDataFim] = useState(dateParaIsoLocal(new Date()));
  const [pickerAtivo, setPickerAtivo] = useState(null); // 'inicio' | 'fim' | null

  // Dados carregados automaticamente do período
  const [sessoesPeriodo, setSessoesPeriodo] = useState([]);
  const [metasPaciente, setMetasPaciente] = useState([]);
  const [passosPaciente, setPassosPaciente] = useState([]);

  // Os 6 blocos de texto editáveis
  const [descricaoAtendimento, setDescricaoAtendimento] = useState('');
  const [objetivosTerapeuticos, setObjetivosTerapeuticos] = useState('');
  const [procedimentosRecursos, setProcedimentosRecursos] = useState('');
  const [evolucaoPaciente, setEvolucaoPaciente] = useState('');
  const [planejamentoTerapeutico, setPlanejamentoTerapeutico] = useState('');
  const [conclusao, setConclusao] = useState('');

  const [gerandoPdf, setGerandoPdf] = useState(false);

  const carregarTela = useCallback(() => {
    const perfilAtual = buscarPerfilProfissional();
    setPastaRelatorios(perfilAtual?.pasta_relatorios || '');
    setRelatorios(listarRelatoriosGerados());
    setPacientes(listarPacientes());
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregarTela();
    }, [carregarTela])
  );

  // Agrupa relatórios por paciente_nome para o SectionList
  const secoesRelatorios = useMemo(() => {
    const mapa = new Map();
    relatorios.forEach((rel) => {
      const chave = rel.paciente_nome || 'Paciente sem nome';
      if (!mapa.has(chave)) {
        mapa.set(chave, []);
      }
      mapa.get(chave).push(rel);
    });

    return Array.from(mapa.entries()).map(([title, data]) => ({
      title,
      data,
    }));
  }, [relatorios]);

  const preencherDadosDoPeriodo = useCallback(
    (idPac, inicioIso, fimIso) => {
      if (!idPac) {
        setSessoesPeriodo([]);
        setMetasPaciente([]);
        setPassosPaciente([]);
        return;
      }

      const pacienteObj = buscarPacientePorId(idPac);
      const perfilAtual = buscarPerfilProfissional();
      const sessoes = listarSessoesPorPeriodo(idPac, inicioIso, fimIso);
      const metas = buscarMetasPaciente(idPac);
      const passos = buscarTodosPassosPaciente(idPac);

      setSessoesPeriodo(sessoes);
      setMetasPaciente(metas);
      setPassosPaciente(passos);

      const textos = gerarTextosIniciaisRelatorio({
        paciente: pacienteObj,
        perfil: perfilAtual,
        sessoes,
        metas,
        passos,
        dataInicio: inicioIso,
        dataFim: fimIso,
      });

      setDescricaoAtendimento(textos.descricaoAtendimento);
      setObjetivosTerapeuticos(textos.objetivosTerapeuticos);
      setProcedimentosRecursos(textos.procedimentosRecursos);
      setEvolucaoPaciente(textos.evolucaoPaciente);
      setPlanejamentoTerapeutico(textos.planejamentoTerapeutico);
      setConclusao(textos.conclusao);
    },
    []
  );

  useEffect(() => {
    if (modalVisivel && pacienteId) {
      preencherDadosDoPeriodo(pacienteId, dataInicio, dataFim);
    }
  }, [modalVisivel, pacienteId, dataInicio, dataFim, preencherDadosDoPeriodo]);

  const handleSelecionarPasta = async () => {
    try {
      const resultado = await selecionarPastaRelatorios();
      if (!resultado.granted || !resultado.uri) {
        return;
      }

      salvarPastaRelatorios(resultado.uri);
      setPastaRelatorios(resultado.uri);

      if (resultado.isInterna) {
        Alert.alert(
          'Pasta configurada',
          'No iOS, os relatórios em PDF são salvos na pasta interna segura do aplicativo e podem ser abertos ou salvos no app Arquivos pelo botão Compartilhar.'
        );
      } else {
        Alert.alert(
          'Pasta configurada',
          `Os relatórios em PDF serão salvos em:\n${formatarNomePasta(resultado.uri)}`
        );
      }
    } catch (erro) {
      Alert.alert(
        'Erro ao selecionar pasta',
        erro?.message || 'Não foi possível configurar a pasta de relatórios.'
      );
    }
  };

  const handleAbrirModalNovo = () => {
    const listaPacientes = listarPacientes();
    setPacientes(listaPacientes);

    if (listaPacientes.length === 0) {
      Alert.alert(
        'Nenhum paciente cadastrado',
        'Cadastre ao menos um paciente na aba "Pacientes" antes de gerar um relatório.'
      );
      return;
    }

    const inicioPadrao = obterInicioMesAtualIso();
    const fimPadrao = dateParaIsoLocal(new Date());
    const idInicial =
      pacienteId && listaPacientes.some((p) => p.id === pacienteId)
        ? pacienteId
        : listaPacientes[0].id;

    setDataInicio(inicioPadrao);
    setDataFim(fimPadrao);
    setPacienteId(idInicial);
    setPickerAtivo(null);
    setModalVisivel(true);
  };

  const handleChangeDataPicker = (event, selectedDate) => {
    const modo = pickerAtivo;
    if (Platform.OS === 'android') {
      setPickerAtivo(null);
    }
    if (event?.type === 'dismissed' || !selectedDate) {
      return;
    }

    const novaIso = dateParaIsoLocal(selectedDate);
    if (modo === 'inicio') {
      setDataInicio(novaIso);
      if (novaIso > dataFim) {
        setDataFim(novaIso);
      }
    } else if (modo === 'fim') {
      setDataFim(novaIso);
      if (novaIso < dataInicio) {
        setDataInicio(novaIso);
      }
    }
  };

  const handleAbrir = async (item) => {
    if (abrindoId || compartilhandoId) return;
    setAbrindoId(item.id);
    try {
      await abrirRelatorioPdf(item.uri_arquivo, item.nome_arquivo);
    } catch (erro) {
      Alert.alert(
        'Não foi possível abrir o PDF',
        erro?.message || 'Ocorreu um erro ao abrir o documento.'
      );
    } finally {
      setAbrindoId(null);
    }
  };

  const handleCompartilhar = async (item) => {
    if (abrindoId || compartilhandoId) return;
    setCompartilhandoId(item.id);
    try {
      await compartilharRelatorioPdf(item.uri_arquivo, item.nome_arquivo);
    } catch (erro) {
      Alert.alert(
        'Não foi possível compartilhar',
        erro?.message || 'Ocorreu um erro ao compartilhar o PDF.'
      );
    } finally {
      setCompartilhandoId(null);
    }
  };

  const handleExcluir = (item) => {
    Alert.alert(
      'Excluir Relatório',
      `Deseja excluir o relatório "${item.nome_arquivo}" de ${item.paciente_nome}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              excluirRelatorioGerado(item.id);
              await excluirArquivoRelatorio(item.uri_arquivo, item.nome_arquivo);
              setRelatorios(listarRelatoriosGerados());
            } catch (erro) {
              Alert.alert('Erro', 'Não foi possível excluir o relatório.');
            }
          },
        },
      ]
    );
  };

  const handleGerarPdf = async () => {
    if (!pacienteId) {
      Alert.alert('Atenção', 'Selecione um paciente.');
      return;
    }
    if (dataInicio > dataFim) {
      Alert.alert('Período inválido', 'A data inicial não pode ser posterior à data final.');
      return;
    }

    setGerandoPdf(true);
    try {
      const perfilAtual = buscarPerfilProfissional();
      const pacienteObj = buscarPacientePorId(pacienteId);
      const sessoesAtuais = listarSessoesPorPeriodo(pacienteId, dataInicio, dataFim);
      const dataEmissao = new Date();

      const html = gerarHtmlRelatorioPdf({
        perfil: perfilAtual,
        paciente: pacienteObj,
        sessoes: sessoesAtuais,
        dataInicio,
        dataFim,
        dataEmissao,
        textos: {
          descricaoAtendimento,
          objetivosTerapeuticos,
          procedimentosRecursos,
          evolucaoPaciente,
          planejamentoTerapeutico,
          conclusao,
        },
      });

      // A4 em 72 PPI: 595 x 842, margens zeradas para o papel timbrado cobrir 100% da folha
      const resultadoPrint = await Print.printToFileAsync({
        html,
        width: 595,
        height: 842,
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        base64: true,
      });

      const existentesBanco = listarRelatoriosGerados().map((r) => r.nome_arquivo);
      const nomeArquivo = await gerarNomeArquivoUnico(
        dataEmissao,
        existentesBanco,
        perfilAtual?.pasta_relatorios || ''
      );

      const salvo = await salvarPdfRelatorio({
        uriTemporario: resultadoPrint.uri,
        base64: resultadoPrint.base64,
        nomeArquivo,
        pastaUri: perfilAtual?.pasta_relatorios || '',
      });

      registrarRelatorioGerado({
        paciente_id: pacienteObj.id,
        paciente_nome: pacienteObj.nome,
        nome_arquivo: salvo.nomeArquivo,
        uri_arquivo: salvo.uriArquivo,
        data_inicio: dataInicio,
        data_fim: dataFim,
      });

      setModalVisivel(false);
      carregarTela();

      const mensagemSucesso = salvo.avisoSaf
        ? `Relatório "${salvo.nomeArquivo}" gerado!\n\n${salvo.avisoSaf}`
        : `Relatório "${salvo.nomeArquivo}" gerado e salvo com sucesso!`;

      Alert.alert('Relatório Gerado', mensagemSucesso, [
        { text: 'Fechar', style: 'cancel' },
        {
          text: 'Abrir',
          onPress: async () => {
            try {
              await abrirRelatorioPdf(salvo.uriArquivo, salvo.nomeArquivo);
            } catch (erroAbrir) {
              Alert.alert(
                'Erro ao abrir',
                erroAbrir?.message || 'Não foi possível abrir o PDF.'
              );
            }
          },
        },
        {
          text: 'Compartilhar',
          onPress: async () => {
            try {
              await compartilharRelatorioPdf(salvo.uriArquivo, salvo.nomeArquivo);
            } catch (erroShare) {
              Alert.alert(
                'Erro ao compartilhar',
                erroShare?.message || 'Não foi possível abrir o compartilhamento.'
              );
            }
          },
        },
      ]);
    } catch (erro) {
      Alert.alert(
        'Erro ao gerar PDF',
        erro?.message || 'Não foi possível gerar ou salvar o relatório em PDF.'
      );
    } finally {
      setGerandoPdf(false);
    }
  };

  const pastaConfigurada = Boolean(pastaRelatorios);
  const modalidadeResumo = obterValorPredominante(sessoesPeriodo, 'modalidade', 'Presencial');
  const formaResumo = obterValorPredominante(sessoesPeriodo, 'forma', 'Individual');
  const duracaoResumo = calcularResumoDuracao(sessoesPeriodo);

  return (
    <View style={styles.container}>
      {/* 1. CARTÃO DE SELEÇÃO DE PASTA NO TOPO */}
      <View style={styles.cardPasta}>
        <View style={styles.rowTopoPasta}>
          <View style={styles.rowStatusPasta}>
            <View
              style={[
                styles.iconePastaBox,
                pastaConfigurada ? styles.iconePastaAtiva : styles.iconePastaPendente,
              ]}
            >
              <Ionicons
                name={pastaConfigurada ? 'folder-open' : 'folder-outline'}
                size={20}
                color={pastaConfigurada ? '#16A34A' : '#D97706'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.rowBadgePasta}>
                <Text style={styles.tituloPasta}>Pasta dos Relatórios</Text>
                <View
                  style={[
                    styles.badgeStatusPasta,
                    pastaConfigurada ? styles.badgeOk : styles.badgeAviso,
                  ]}
                >
                  <Ionicons
                    name={pastaConfigurada ? 'checkmark-circle' : 'alert-circle'}
                    size={12}
                    color={pastaConfigurada ? '#16A34A' : '#D97706'}
                  />
                  <Text
                    style={[
                      styles.txtBadgePasta,
                      { color: pastaConfigurada ? '#15803D' : '#B45309' },
                    ]}
                  >
                    {pastaConfigurada ? 'Configurada' : 'Padrão'}
                  </Text>
                </View>
              </View>
              <Text style={styles.caminhoPasta} numberOfLines={2}>
                {pastaConfigurada
                  ? formatarNomePasta(pastaRelatorios)
                  : Platform.OS === 'android'
                  ? 'Nenhuma pasta externa escolhida (salva internamente até configurar).'
                  : 'Toque para configurar a pasta interna de relatórios.'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.btnSelecionarPasta}
          onPress={handleSelecionarPasta}
          activeOpacity={0.75}
        >
          <Ionicons name="folder-open-outline" size={18} color="#2563EB" />
          <Text style={styles.txtBtnPasta}>
            {pastaConfigurada ? 'Alterar Pasta de Destino' : 'Selecionar Pasta no Dispositivo'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. LISTA DE RELATÓRIOS AGRUPADOS POR PACIENTE */}
      <SectionList
        sections={secoesRelatorios}
        keyExtractor={(item) => String(item.id)}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listaConteudo}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="document-text-outline" size={38} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitulo}>Nenhum relatório gerado ainda</Text>
            <Text style={styles.emptyTexto}>
              Toque no botão abaixo para selecionar um paciente, revisar os textos preenchidos automaticamente e gerar o PDF.
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.secaoHeader}>
            <View style={styles.secaoHeaderEsq}>
              <Ionicons name="person-circle-outline" size={20} color="#2563EB" />
              <Text style={styles.secaoHeaderTitulo} numberOfLines={1}>
                {section.title}
              </Text>
            </View>
            <View style={styles.badgeQtd}>
              <Text style={styles.txtBadgeQtd}>
                {section.data.length}{' '}
                {section.data.length === 1 ? 'relatório' : 'relatórios'}
              </Text>
            </View>
          </View>
        )}
        renderItem={({ item }) => {
          const abrindoEste = abrindoId === item.id;
          const compartilhandoEste = compartilhandoId === item.id;
          return (
            <View style={styles.cardRelatorio}>
              <View style={styles.rowRelatorioInfo}>
                <View style={styles.iconePdfBox}>
                  <Ionicons name="document-text" size={22} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nomeArquivo} numberOfLines={1}>
                    {item.nome_arquivo}
                  </Text>
                  <Text style={styles.periodoArquivo}>
                    Período: {formatarDataIsoParaBR(item.data_inicio)} a{' '}
                    {formatarDataIsoParaBR(item.data_fim)}
                  </Text>
                </View>
              </View>

              <View style={styles.rowAcoesRelatorio}>
                <TouchableOpacity
                  style={styles.btnAbrir}
                  onPress={() => handleAbrir(item)}
                  disabled={abrindoEste || compartilhandoEste}
                  activeOpacity={0.75}
                >
                  {abrindoEste ? (
                    <ActivityIndicator size="small" color="#15803D" />
                  ) : (
                    <>
                      <Ionicons name="eye-outline" size={16} color="#15803D" />
                      <Text style={styles.txtBtnAbrir}>Abrir</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnCompartilhar}
                  onPress={() => handleCompartilhar(item)}
                  disabled={abrindoEste || compartilhandoEste}
                  activeOpacity={0.75}
                >
                  {compartilhandoEste ? (
                    <ActivityIndicator size="small" color="#2563EB" />
                  ) : (
                    <>
                      <Ionicons name="share-outline" size={16} color="#2563EB" />
                      <Text style={styles.txtBtnCompartilhar}>Compartilhar</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnExcluir}
                  onPress={() => handleExcluir(item)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <Text style={styles.txtBtnExcluir}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* 3. BOTÃO FIXO NO FINAL DA TELA */}
      <View style={styles.rodapeFixo}>
        <TouchableOpacity
          style={styles.btnNovoRelatorio}
          onPress={handleAbrirModalNovo}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle" size={22} color="#FFF" />
          <Text style={styles.txtBtnNovoRelatorio}>Novo Relatório em PDF</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL DE CRIAÇÃO E REVISÃO DO RELATÓRIO */}
      <Modal
        visible={modalVisivel}
        animationType="slide"
        onRequestClose={() => !gerandoPdf && setModalVisivel(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalContainer, { paddingTop: insets.top + 12 }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalSubtitulo}>Geração de PDF Clínico</Text>
              <Text style={styles.modalTitulo}>Novo Relatório</Text>
            </View>
            <TouchableOpacity
              onPress={() => !gerandoPdf && setModalVisivel(false)}
              disabled={gerandoPdf}
            >
              <Ionicons name="close-circle" size={32} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          >
            {/* A) SELEÇÃO DE PACIENTE */}
            <View style={styles.modalCard}>
              <Text style={styles.secaoModalTitulo}>Paciente e Período</Text>

              <Text style={styles.label}>Paciente *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.rowScroll}
              >
                {pacientes.map((p) => {
                  const ativo = p.id === pacienteId;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.chip, ativo && styles.chipAtivo]}
                      onPress={() => setPacienteId(p.id)}
                    >
                      <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>
                        {p.nome}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* B) SELEÇÃO DE PERÍODO */}
              <View style={styles.rowDatas}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Data Início</Text>
                  <TouchableOpacity
                    style={styles.btnDataPicker}
                    onPress={() => setPickerAtivo('inicio')}
                  >
                    <Ionicons name="calendar-outline" size={18} color="#2563EB" />
                    <Text style={styles.txtDataPicker}>
                      {formatarDataIsoParaBR(dataInicio)}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Data Fim</Text>
                  <TouchableOpacity
                    style={styles.btnDataPicker}
                    onPress={() => setPickerAtivo('fim')}
                  >
                    <Ionicons name="calendar-outline" size={18} color="#2563EB" />
                    <Text style={styles.txtDataPicker}>
                      {formatarDataIsoParaBR(dataFim)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {pickerAtivo && (
                <View style={styles.pickerWrapper}>
                  <DateTimePicker
                    value={isoParaDateLocal(pickerAtivo === 'inicio' ? dataInicio : dataFim)}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleChangeDataPicker}
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      style={styles.btnFecharPickerIos}
                      onPress={() => setPickerAtivo(null)}
                    >
                      <Text style={styles.txtFecharPickerIos}>Confirmar Data</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* C) RESUMO DOS DADOS CARREGADOS */}
              <View
                style={[
                  styles.boxResumoPeriodo,
                  sessoesPeriodo.length > 0 ? styles.boxResumoOk : styles.boxResumoVazio,
                ]}
              >
                <View style={styles.rowResumoTopo}>
                  <Ionicons
                    name={sessoesPeriodo.length > 0 ? 'checkmark-circle' : 'information-circle'}
                    size={20}
                    color={sessoesPeriodo.length > 0 ? '#16A34A' : '#D97706'}
                  />
                  <Text
                    style={[
                      styles.txtResumoTitulo,
                      { color: sessoesPeriodo.length > 0 ? '#15803D' : '#B45309' },
                    ]}
                  >
                    {sessoesPeriodo.length > 0
                      ? `${sessoesPeriodo.length} ${
                          sessoesPeriodo.length === 1
                            ? 'sessão realizada encontrada'
                            : 'sessões realizadas encontradas'
                        } no período`
                      : 'Nenhuma sessão realizada encontrada neste período'}
                  </Text>
                </View>

                <Text style={styles.txtResumoDetalhes}>
                  {modalidadeResumo} / {formaResumo} • Duração: {duracaoResumo} •{' '}
                  {metasPaciente.length}{' '}
                  {metasPaciente.length === 1 ? 'meta' : 'metas'} • {passosPaciente.length}{' '}
                  {passosPaciente.length === 1 ? 'passo' : 'passos'}
                </Text>

                <TouchableOpacity
                  style={styles.btnRecarregarTextos}
                  onPress={() => preencherDadosDoPeriodo(pacienteId, dataInicio, dataFim)}
                >
                  <Ionicons name="refresh-outline" size={14} color="#2563EB" />
                  <Text style={styles.txtRecarregarTextos}>
                    Restaurar textos automáticos
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* D) REVISÃO E EDIÇÃO DOS 6 BLOCOS DE TEXTO */}
            <View style={styles.modalCard}>
              <Text style={styles.secaoModalTitulo}>Revisão do Conteúdo do Relatório</Text>
              <Text style={styles.subAviso}>
                Os campos abaixo foram preenchidos automaticamente com base no período e no prontuário. Edite livremente antes de gerar o PDF.
              </Text>

              <Text style={styles.label}>1. Descrição do atendimento</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                value={descricaoAtendimento}
                onChangeText={setDescricaoAtendimento}
                placeholder="Descreva o formato e contexto do atendimento..."
              />

              <Text style={styles.label}>2. Objetivos terapêuticos</Text>
              <TextInput
                style={[styles.input, styles.textAreaGrande]}
                multiline
                value={objetivosTerapeuticos}
                onChangeText={setObjetivosTerapeuticos}
                placeholder="- Objetivo 1&#10;- Objetivo 2"
              />

              <Text style={styles.label}>
                3. Procedimentos, técnicas e recursos utilizados
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                value={procedimentosRecursos}
                onChangeText={setProcedimentosRecursos}
                placeholder="Materiais, jogos e técnicas aplicadas no período..."
              />

              <Text style={styles.label}>4. Evolução do paciente</Text>
              <TextInput
                style={[styles.input, styles.textAreaGrande]}
                multiline
                value={evolucaoPaciente}
                onChangeText={setEvolucaoPaciente}
                placeholder="Síntese da evolução observada nas sessões..."
              />

              <Text style={styles.label}>5. Planejamento terapêutico</Text>
              <TextInput
                style={[styles.input, styles.textAreaGrande]}
                multiline
                value={planejamentoTerapeutico}
                onChangeText={setPlanejamentoTerapeutico}
                placeholder="Próximos passos e metas em continuidade..."
              />

              <Text style={styles.label}>6. Conclusão</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                value={conclusao}
                onChangeText={setConclusao}
                placeholder="Fechamento clínico e recomendações..."
              />
            </View>

            {/* E) BOTÃO DE CONFIRMAÇÃO */}
            <TouchableOpacity
              style={[styles.btnGerarPdf, gerandoPdf && styles.btnDesabilitado]}
              onPress={handleGerarPdf}
              disabled={gerandoPdf}
              activeOpacity={0.85}
            >
              {gerandoPdf ? (
                <>
                  <ActivityIndicator size="small" color="#FFF" />
                  <Text style={styles.txtBtnGerarPdf}>Gerando PDF...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={22} color="#FFF" />
                  <Text style={styles.txtBtnGerarPdf}>Gerar e Salvar Relatório PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  cardPasta: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rowTopoPasta: {
    marginBottom: 12,
  },
  rowStatusPasta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconePastaBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconePastaAtiva: {
    backgroundColor: '#F0FDF4',
  },
  iconePastaPendente: {
    backgroundColor: '#FFFBEB',
  },
  rowBadgePasta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  tituloPasta: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  badgeStatusPasta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeOk: {
    backgroundColor: '#DCFCE7',
  },
  badgeAviso: {
    backgroundColor: '#FEF3C7',
  },
  txtBadgePasta: {
    fontSize: 11,
    fontWeight: '700',
  },
  caminhoPasta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  btnSelecionarPasta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 10,
    borderRadius: 8,
  },
  txtBtnPasta: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 13,
  },
  listaConteudo: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  secaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  secaoHeaderEsq: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  secaoHeaderTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  badgeQtd: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  txtBadgeQtd: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  cardRelatorio: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rowRelatorioInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 11,
  },
  iconePdfBox: {
    width: 40,
    height: 40,
    borderRadius: 9,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nomeArquivo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  periodoArquivo: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  rowAcoesRelatorio: {
    flexDirection: 'row',
    gap: 8,
  },
  btnAbrir: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingVertical: 9,
    borderRadius: 8,
  },
  txtBtnAbrir: {
    color: '#15803D',
    fontWeight: '700',
    fontSize: 12.5,
  },
  btnCompartilhar: {
    flex: 1.25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 9,
    borderRadius: 8,
  },
  txtBtnCompartilhar: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 12.5,
  },
  btnExcluir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 8,
  },
  txtBtnExcluir: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 12.5,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptyTexto: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
  },
  rodapeFixo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  btnNovoRelatorio: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  txtBtnNovoRelatorio: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Estilos do Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalSubtitulo: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
    textTransform: 'uppercase',
  },
  modalTitulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secaoModalTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  subAviso: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
    lineHeight: 17,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 10,
    marginBottom: 5,
  },
  rowScroll: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    marginRight: 8,
  },
  chipAtivo: {
    backgroundColor: '#2563EB',
  },
  chipTexto: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 13,
  },
  chipTextoAtivo: {
    color: '#FFFFFF',
  },
  rowDatas: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  btnDataPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    padding: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  txtDataPicker: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  pickerWrapper: {
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  btnFecharPickerIos: {
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#2563EB',
    borderRadius: 6,
    marginTop: 4,
  },
  txtFecharPickerIos: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  boxResumoPeriodo: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  boxResumoOk: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  boxResumoVazio: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  rowResumoTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txtResumoTitulo: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  txtResumoDetalhes: {
    fontSize: 12,
    color: '#475569',
    marginTop: 5,
  },
  btnRecarregarTextos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  txtRecarregarTextos: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 11,
    fontSize: 13.5,
    color: '#0F172A',
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  textAreaGrande: {
    minHeight: 118,
    textAlignVertical: 'top',
  },
  btnGerarPdf: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 4,
  },
  btnDesabilitado: {
    opacity: 0.7,
  },
  txtBtnGerarPdf: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
