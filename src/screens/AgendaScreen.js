import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, ScrollView, TextInput, Alert, Platform
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import {
  listarAgendaPorData,
  listarDatasComSessoes,
  buscarMetasPaciente,
  buscarPassosPorMeta,
  alternarPassoTrilha,
  atualizarSessaoCompleta,
  excluirSessao
} from '../database/db';
import TrilhaAprendizado from '../components/TrilhaAprendizado';

export default function AgendaScreen() {
  const hoje = new Date().toISOString().split('T')[0];
  const [dataSelecionada, setDataSelecionada] = useState(hoje);
  const [sessoesDoDia, setSessoesDoDia] = useState([]);
  const [datasMarcadas, setDatasMarcadas] = useState({});

  // Estados de Visualização e Edição do Atendimento
  const [sessaoSelecionada, setSessaoSelecionada] = useState(null);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [metasPaciente, setMetasPaciente] = useState([]);
  const [passosDaMeta, setPassosDaMeta] = useState([]);

  // Campos Editáveis
  const [editStatus, setEditStatus] = useState('realizada');
  const [editMetaId, setEditMetaId] = useState(null);
  const [editPassoId, setEditPassoId] = useState(null);
  const [editData, setEditData] = useState('');
  const [editInicio, setEditInicio] = useState('');
  const [editFim, setEditFim] = useState('');
  const [editObjetivo, setEditObjetivo] = useState('');
  const [editMaterial, setEditMaterial] = useState('');
  const [editRelatorio, setEditRelatorio] = useState('');
  const [editAnotacoes, setEditAnotacoes] = useState('');

  // Controle do DateTimePicker na edição
  const [pickerModo, setPickerModo] = useState(null); // 'data', 'inicio', 'fim'

  const carregarDadosAgenda = (dataAlvo) => {
    const listaDia = listarAgendaPorData(dataAlvo);
    setSessoesDoDia(listaDia);

    const todasDatas = listarDatasComSessoes();
    const marcacoes = {};

    todasDatas.forEach((item) => {
      marcacoes[item.data] = {
        marked: true,
        dotColor: item.status === 'agendada' ? '#D97706' : '#16A34A',
      };
    });

    marcacoes[dataAlvo] = {
      ...(marcacoes[dataAlvo] || {}),
      selected: true,
      selectedColor: '#2563EB',
    };

    setDatasMarcadas(marcacoes);
  };

  useFocusEffect(
    useCallback(() => {
      carregarDadosAgenda(dataSelecionada);
    }, [dataSelecionada])
  );

  const selecionarDia = (day) => {
    setDataSelecionada(day.dateString);
    carregarDadosAgenda(day.dateString);
  };

  const abrirDetalhesSessao = (sessao) => {
    setSessaoSelecionada(sessao);
    setModoEdicao(false);
    setEditStatus(sessao.status || 'realizada');
    setEditMetaId(sessao.meta_id_real || null);
    setEditPassoId(sessao.passo_id || null);
    setEditData(sessao.data || dataSelecionada);
    setEditInicio(sessao.horario_inicio || '14:00');
    setEditFim(sessao.horario_termino || '14:50');
    setEditObjetivo(sessao.objetivo_titulo || '');
    setEditMaterial(sessao.material_utilizado || '');
    setEditRelatorio(sessao.relatorio_diario || '');
    setEditAnotacoes(sessao.anotacoes || '');

    const metasDoPac = buscarMetasPaciente(sessao.paciente_id);
    setMetasPaciente(metasDoPac);

    if (sessao.meta_id_real) {
      setPassosDaMeta(buscarPassosPorMeta(sessao.meta_id_real));
    } else {
      setPassosDaMeta([]);
    }
  };

  const handleTrocarMetaEdicao = (idNovaMeta) => {
    setEditMetaId(idNovaMeta);
    const novosPassos = buscarPassosPorMeta(idNovaMeta);
    setPassosDaMeta(novosPassos);
    setEditPassoId(novosPassos[0] ? novosPassos[0].id : null);
  };

  // Conversores seguros para o DateTimePicker
  const obterDataObj = (strData) => {
    if (!strData) return new Date();
    const [ano, mes, dia] = strData.split('-').map(Number);
    return new Date(ano, mes - 1, dia, 12, 0, 0);
  };

  const obterHoraObj = (strHora) => {
    const hojeData = new Date();
    if (!strHora || !strHora.includes(':')) return hojeData;
    const [h, m] = strHora.split(':').map(Number);
    hojeData.setHours(h || 0, m || 0, 0, 0);
    return hojeData;
  };

  const onChangePicker = (event, selectedDate) => {
    const modoAtual = pickerModo;
    if (Platform.OS === 'android') setPickerModo(null);
    if (!selectedDate) return;

    if (modoAtual === 'data') {
      const ano = selectedDate.getFullYear();
      const mes = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const dia = String(selectedDate.getDate()).padStart(2, '0');
      setEditData(`${ano}-${mes}-${dia}`);
    } else if (modoAtual === 'inicio') {
      const horaFormatada = selectedDate.toTimeString().split(' ')[0].substring(0, 5);
      setEditInicio(horaFormatada);
    } else if (modoAtual === 'fim') {
      const horaFormatada = selectedDate.toTimeString().split(' ')[0].substring(0, 5);
      setEditFim(horaFormatada);
    }
  };

  const handleSalvarEdicao = () => {
    if (!sessaoSelecionada) return;

    atualizarSessaoCompleta(sessaoSelecionada.id, {
      meta_id: editMetaId,
      passo_id: editPassoId,
      status: editStatus,
      objetivo_titulo: editObjetivo.trim() || 'Sessão Agendada',
      data: editData.trim(),
      horario_inicio: editInicio.trim(),
      horario_termino: editFim.trim(),
      material_utilizado: editMaterial.trim(),
      relatorio_diario: editRelatorio.trim(),
      anotacoes: editAnotacoes.trim(),
    });

    // Atualiza a data selecionada no calendário caso o usuário tenha mudado o dia
    setDataSelecionada(editData);
    carregarDadosAgenda(editData);

    const listaDoNovoDia = listarAgendaPorData(editData);
    const atualizada = listaDoNovoDia.find((s) => s.id === sessaoSelecionada.id);
    if (atualizada) {
      setSessaoSelecionada(atualizada);
    } else {
      setSessaoSelecionada(null);
    }

    setModoEdicao(false);
    Alert.alert('Sucesso', 'Atendimento atualizado!');
  };

  const handleExcluirSessao = () => {
    if (!sessaoSelecionada) return;
    Alert.alert(
      'Excluir Atendimento',
      'Tem certeza que deseja apagar este atendimento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            excluirSessao(sessaoSelecionada.id);
            setSessaoSelecionada(null);
            carregarDadosAgenda(dataSelecionada);
          },
        },
      ]
    );
  };

  const handleTogglePassoNaAgenda = (passo) => {
    alternarPassoTrilha(passo.id, passo.concluido === 0);
    if (editMetaId) {
      setPassosDaMeta(buscarPassosPorMeta(editMetaId));
    }
    carregarDadosAgenda(dataSelecionada);
  };

  const metaEmEdicaoObj = metasPaciente.find((m) => m.id === editMetaId);

  return (
    <View style={styles.container}>
      <Calendar
        current={dataSelecionada}
        onDayPress={selecionarDia}
        markedDates={datasMarcadas}
        theme={{
          selectedDayBackgroundColor: '#2563EB',
          todayTextColor: '#2563EB',
          arrowColor: '#2563EB',
        }}
        style={styles.calendario}
      />

      <View style={styles.listaContainer}>
        <Text style={styles.tituloDia}>Atendimentos em {dataSelecionada}</Text>

        <FlatList
          data={sessoesDoDia}
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={
            <Text style={styles.vazio}>Nenhum atendimento para esta data.</Text>
          }
          renderItem={({ item }) => {
            const corMeta = item.meta_cor || '#2563EB';
            const iconeMeta = item.meta_icone || 'flag';

            return (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => abrirDetalhesSessao(item)}
                style={[styles.cardItem, { borderLeftColor: corMeta }]}
              >
                <View style={styles.topoCard}>
                  <View style={styles.rowIconeMeta}>
                    <View style={[styles.badgeIcone, { backgroundColor: corMeta }]}>
                      <Ionicons name={iconeMeta} size={16} color="#FFF" />
                    </View>
                    <View>
                      <Text style={styles.nomePaciente}>{item.paciente_nome}</Text>
                      <Text style={styles.horario}>
                        {item.horario_inicio} - {item.horario_termino}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.tagStatus,
                      item.status === 'agendada' ? styles.tagAgendada : styles.tagRealizada,
                    ]}
                  >
                    {item.status.toUpperCase()}
                  </Text>
                </View>

                <Text style={styles.objetivo}>{item.objetivo_titulo}</Text>

                {item.meta_titulo ? (
                  <Text style={[styles.metaInfo, { color: corMeta }]}>
                    Meta: {item.meta_titulo} {item.passo_titulo ? `• Passo: ${item.passo_titulo}` : ''}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* MODAL DE DETALHES / EDIÇÃO / EXCLUSÃO */}
      <Modal visible={!!sessaoSelecionada} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalSubtitulo}>Atendimento</Text>
              <Text style={styles.modalTitulo}>{sessaoSelecionada?.paciente_nome}</Text>
            </View>

            <View style={styles.headerAcoes}>
              <TouchableOpacity
                style={styles.btnAcaoHeader}
                onPress={() => setModoEdicao(!modoEdicao)}
              >
                <Ionicons name={modoEdicao ? 'eye-outline' : 'create-outline'} size={22} color="#2563EB" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.btnAcaoHeader} onPress={handleExcluirSessao}>
                <Ionicons name="trash-outline" size={22} color="#EF4444" />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setSessaoSelecionada(null)}>
                <Ionicons name="close-circle" size={32} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
            <View style={styles.cardDetalhes}>
              {sessaoSelecionada?.meta_titulo && !modoEdicao ? (
                <View
                  style={[
                    styles.bannerMeta,
                    { backgroundColor: sessaoSelecionada.meta_cor || '#2563EB' },
                  ]}
                >
                  <Ionicons name={sessaoSelecionada.meta_icone || 'flag'} size={20} color="#FFF" />
                  <Text style={styles.bannerMetaTexto}>
                    Meta: {sessaoSelecionada.meta_titulo}
                  </Text>
                </View>
              ) : null}

              {modoEdicao ? (
                <>
                  <Text style={styles.labelCampo}>Status</Text>
                  <View style={styles.rowStatusEdit}>
                    <TouchableOpacity
                      style={[styles.btnStatus, editStatus === 'realizada' && styles.btnRealizadaAtivo]}
                      onPress={() => setEditStatus('realizada')}
                    >
                      <Text style={[styles.txtStatus, editStatus === 'realizada' && { color: '#FFF' }]}>
                        Realizada
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btnStatus, editStatus === 'agendada' && styles.btnAgendadaAtivo]}
                      onPress={() => setEditStatus('agendada')}
                    >
                      <Text style={[styles.txtStatus, editStatus === 'agendada' && { color: '#FFF' }]}>
                        Agendada
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.labelCampo}>Meta Vinculada</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                    {metasPaciente.map((m) => {
                      const ativa = editMetaId === m.id;
                      const corM = m.cor || '#2563EB';
                      return (
                        <TouchableOpacity
                          key={m.id}
                          onPress={() => handleTrocarMetaEdicao(m.id)}
                          style={[
                            styles.chipPasso,
                            ativa && { backgroundColor: corM },
                          ]}
                        >
                          <Ionicons name={m.icone || 'flag'} size={14} color={ativa ? '#FFF' : corM} />
                          <Text style={[styles.chipPassoTxt, ativa && { color: '#FFF' }]}>
                            {m.descricao}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {passosDaMeta.length > 0 && (
                    <>
                      <Text style={styles.labelCampo}>Passo da Trilha Trabalhado</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                        {passosDaMeta.map((p, idx) => (
                          <TouchableOpacity
                            key={p.id}
                            onPress={() => setEditPassoId(p.id)}
                            style={[
                              styles.chipPasso,
                              editPassoId === p.id && { backgroundColor: metaEmEdicaoObj?.cor || '#2563EB' },
                            ]}
                          >
                            <Text style={[styles.chipPassoTxt, editPassoId === p.id && { color: '#FFF' }]}>
                              {idx + 1}º: {p.titulo}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </>
                  )}

                  {/* DATA E HORÁRIOS EDITÁVEIS */}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <View style={{ flex: 1.2 }}>
                      <Text style={styles.labelCampo}>Data do Agendamento</Text>
                      <TouchableOpacity style={styles.btnPicker} onPress={() => setPickerModo('data')}>
                        <Ionicons name="calendar-outline" size={16} color="#2563EB" />
                        <Text style={styles.txtPicker}>{editData}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.labelCampo}>Início</Text>
                      <TouchableOpacity style={styles.btnPicker} onPress={() => setPickerModo('inicio')}>
                        <Ionicons name="time-outline" size={16} color="#2563EB" />
                        <Text style={styles.txtPicker}>{editInicio}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.labelCampo}>Término</Text>
                      <TouchableOpacity style={styles.btnPicker} onPress={() => setPickerModo('fim')}>
                        <Ionicons name="time-outline" size={16} color="#2563EB" />
                        <Text style={styles.txtPicker}>{editFim}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {pickerModo && (
                    <DateTimePicker
                      value={
                        pickerModo === 'data'
                          ? obterDataObj(editData)
                          : pickerModo === 'inicio'
                          ? obterHoraObj(editInicio)
                          : obterHoraObj(editFim)
                      }
                      mode={pickerModo === 'data' ? 'date' : 'time'}
                      is24Hour={true}
                      onChange={onChangePicker}
                    />
                  )}

                  <Text style={styles.labelCampo}>Objetivo da Sessão (Título)</Text>
                  <TextInput style={styles.inputEdit} value={editObjetivo} onChangeText={setEditObjetivo} />

                  <Text style={styles.labelCampo}>Material Utilizado</Text>
                  <TextInput style={styles.inputEdit} value={editMaterial} onChangeText={setEditMaterial} />

                  <Text style={styles.labelCampo}>Relatório Diário</Text>
                  <TextInput
                    style={[styles.inputEdit, { height: 70, textAlignVertical: 'top' }]}
                    multiline
                    value={editRelatorio}
                    onChangeText={setEditRelatorio}
                  />

                  <Text style={styles.labelCampo}>Anotações da Sessão</Text>
                  <TextInput
                    style={[styles.inputEdit, { height: 90, textAlignVertical: 'top' }]}
                    multiline
                    value={editAnotacoes}
                    onChangeText={setEditAnotacoes}
                  />

                  <TouchableOpacity style={styles.btnSalvarEdicao} onPress={handleSalvarEdicao}>
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                    <Text style={styles.txtSalvarEdicao}>Salvar Alterações</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.horarioDetalhe}>
                    Data: {sessaoSelecionada?.data} • {sessaoSelecionada?.horario_inicio} às {sessaoSelecionada?.horario_termino} ({sessaoSelecionada?.status?.toUpperCase()})
                  </Text>

                  <Text style={styles.labelCampo}>Passo Trabalhado</Text>
                  <Text style={styles.valorCampo}>
                    {sessaoSelecionada?.passo_titulo || 'Nenhum passo específico selecionado'}
                  </Text>

                  <Text style={styles.labelCampo}>Objetivo da Sessão</Text>
                  <Text style={styles.valorCampo}>{sessaoSelecionada?.objetivo_titulo || 'Não informado'}</Text>

                  <Text style={styles.labelCampo}>Material Utilizado</Text>
                  <Text style={styles.valorCampo}>{sessaoSelecionada?.material_utilizado || 'Não informado'}</Text>

                  <Text style={styles.labelCampo}>Relatório Diário</Text>
                  <Text style={styles.valorCampo}>{sessaoSelecionada?.relatorio_diario || 'Não informado'}</Text>

                  <Text style={styles.labelCampo}>Anotações da Sessão</Text>
                  <Text style={styles.valorCampo}>{sessaoSelecionada?.anotacoes || 'Não informado'}</Text>
                </>
              )}
            </View>

            {editMetaId && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.dicaTrilha}>
                  Toque no passo abaixo para marcar como concluído ou pendente:
                </Text>
                <TrilhaAprendizado
                  metaTitulo={metaEmEdicaoObj?.descricao || sessaoSelecionada?.meta_titulo}
                  metaAlcancada={metaEmEdicaoObj?.alcancada === 1}
                  passos={passosDaMeta}
                  passoDestaqueId={editPassoId}
                  onTogglePasso={handleTogglePassoNaAgenda}
                />
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  calendario: { borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  listaContainer: { flex: 1, padding: 16 },
  tituloDia: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 12 },
  vazio: { textAlign: 'center', color: '#94A3B8', marginTop: 24 },
  cardItem: {
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topoCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  rowIconeMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badgeIcone: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  nomePaciente: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  horario: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  tagStatus: { fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagRealizada: { backgroundColor: '#DCFCE7', color: '#15803D' },
  tagAgendada: { backgroundColor: '#FEF3C7', color: '#B45309' },
  objetivo: { fontSize: 14, fontWeight: '600', color: '#334155', marginTop: 2 },
  metaInfo: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  modalContainer: { flex: 1, backgroundColor: '#F1F5F9', padding: 16, paddingTop: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalSubtitulo: { fontSize: 12, fontWeight: '700', color: '#2563EB', textTransform: 'uppercase' },
  modalTitulo: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  headerAcoes: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnAcaoHeader: { backgroundColor: '#FFF', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  cardDetalhes: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  bannerMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, marginBottom: 12 },
  bannerMetaTexto: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  horarioDetalhe: { fontSize: 13, fontWeight: '700', color: '#475569' },
  labelCampo: { fontSize: 12, fontWeight: '700', color: '#64748B', marginTop: 12, marginBottom: 4 },
  valorCampo: { fontSize: 14, color: '#1E293B', lineHeight: 20 },
  inputEdit: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 14, color: '#0F172A' },
  btnPicker: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1' },
  txtPicker: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  rowStatusEdit: { flexDirection: 'row', gap: 8 },
  btnStatus: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center' },
  btnRealizadaAtivo: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  btnAgendadaAtivo: { backgroundColor: '#D97706', borderColor: '#D97706' },
  txtStatus: { fontWeight: 'bold', color: '#475569' },
  chipPasso: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#E2E8F0', marginRight: 8 },
  chipPassoTxt: { fontSize: 12, fontWeight: '600', color: '#1E293B' },
  btnSalvarEdicao: { backgroundColor: '#2563EB', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 14, borderRadius: 10, marginTop: 16 },
  txtSalvarEdicao: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  dicaTrilha: { fontSize: 12, fontWeight: '600', color: '#475569', marginTop: 8 },
});