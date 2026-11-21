import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, Modal, ScrollView, Alert, Platform
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import {
  criarPaciente, editarPaciente, listarPacientes, adicionarMeta, editarMeta, excluirMeta,
  buscarMetasPaciente, adicionarPassoTrilha, buscarPassosPorMeta,
  alternarPassoTrilha, excluirPassoTrilha, listarSessoesPaciente,
  atualizarSessaoCompleta, excluirSessao
} from '../database/db';
import TrilhaAprendizado from '../components/TrilhaAprendizado';
import SeletorVisual from '../components/SeletorVisual';

// Formata automaticamente enquanto digita: DD/MM/AAAA
const formatarDataBR = (texto) => {
  const numeros = texto.replace(/\D/g, '').slice(0, 8);
  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 4) return `${numeros.slice(0, 2)}/${numeros.slice(2)}`;
  return `${numeros.slice(0, 2)}/${numeros.slice(2, 4)}/${numeros.slice(4)}`;
};

export default function PacientesScreen() {
  const [pacientes, setPacientes] = useState([]);
  const [busca, setBusca] = useState('');

  // Cadastro de novo paciente
  const [mostrarFormNovo, setMostrarFormNovo] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoNascimento, setNovoNascimento] = useState('');
  const [novoResponsavel, setNovoResponsavel] = useState('');

  // Prontuário e Edição de Dados do Paciente
  const [pacienteSelecionado, setPacienteSelecionado] = useState(null);
  const [editandoPaciente, setEditandoPaciente] = useState(false);
  const [editPacNome, setEditPacNome] = useState('');
  const [editPacNascimento, setEditPacNascimento] = useState('');
  const [editPacResponsavel, setEditPacResponsavel] = useState('');

  // Metas
  const [metas, setMetas] = useState([]);
  const [novaMeta, setNovaMeta] = useState('');
  const [iconeMeta, setIconeMeta] = useState('flag');
  const [corMeta, setCorMeta] = useState('#2563EB');
  const [mostrarSeletorMeta, setMostrarSeletorMeta] = useState(false);

  const [metaAtivaId, setMetaAtivaId] = useState(null);
  const [editandoMetaAtual, setEditandoMetaAtual] = useState(false);
  const [editMetaDesc, setEditMetaDesc] = useState('');
  const [editMetaIcone, setEditMetaIcone] = useState('flag');
  const [editMetaCor, setEditMetaCor] = useState('#2563EB');

  const [passosDaMeta, setPassosDaMeta] = useState([]);
  const [sessoes, setSessoes] = useState([]);

  // Histórico de Sessões (Detalhes e Edição)
  const [sessaoHistoricoAberta, setSessaoHistoricoAberta] = useState(null);
  const [modoEdicaoSessao, setModoEdicaoSessao] = useState(false);
  const [editStatus, setEditStatus] = useState('realizada');
  const [editModalidade, setEditModalidade] = useState('Presencial');
  const [editForma, setEditForma] = useState('Individual');
  const [editSessaoMetaId, setEditSessaoMetaId] = useState(null);
  const [editSessaoPassoId, setEditSessaoPassoId] = useState(null);
  const [passosSessaoEdit, setPassosSessaoEdit] = useState([]);
  const [editData, setEditData] = useState('');
  const [editInicio, setEditInicio] = useState('');
  const [editFim, setEditFim] = useState('');
  const [editObjetivo, setEditObjetivo] = useState('');
  const [editAtividade, setEditAtividade] = useState('');
  const [editMaterial, setEditMaterial] = useState('');
  const [editRelatorio, setEditRelatorio] = useState('');
  const [editAnotacoes, setEditAnotacoes] = useState('');
  const [pickerModo, setPickerModo] = useState(null);

  const carregarPacientes = () => {
    setPacientes(listarPacientes());
  };

  useFocusEffect(
    useCallback(() => {
      carregarPacientes();
    }, [])
  );

  const handleCriarPaciente = () => {
    if (!novoNome.trim()) {
      Alert.alert('Atenção', 'Digite o nome do paciente.');
      return;
    }
    criarPaciente(novoNome.trim(), novoNascimento.trim(), novoResponsavel.trim());
    setNovoNome('');
    setNovoNascimento('');
    setNovoResponsavel('');
    setMostrarFormNovo(false);
    carregarPacientes();
  };

  const recarregarDadosProntuario = (pacienteId, metaIdParaAbrir = metaAtivaId) => {
    const listaMetas = buscarMetasPaciente(pacienteId);
    setMetas(listaMetas);
    setSessoes(listarSessoesPaciente(pacienteId));

    const idAlvo =
      listaMetas.some((m) => m.id === metaIdParaAbrir)
        ? metaIdParaAbrir
        : listaMetas[0]
        ? listaMetas[0].id
        : null;

    setMetaAtivaId(idAlvo);
    if (idAlvo) {
      setPassosDaMeta(buscarPassosPorMeta(idAlvo));
    } else {
      setPassosDaMeta([]);
      setEditandoMetaAtual(false);
    }
  };

  const abrirProntuario = (paciente) => {
    setPacienteSelecionado(paciente);
    setEditPacNome(paciente.nome || '');
    setEditPacNascimento(paciente.data_nascimento || '');
    setEditPacResponsavel(paciente.responsavel || '');
    setEditandoPaciente(false);
    setSessaoHistoricoAberta(null);
    setEditandoMetaAtual(false);
    recarregarDadosProntuario(paciente.id, null);
  };

  const handleSalvarDadosPaciente = () => {
    if (!pacienteSelecionado || !editPacNome.trim()) {
      Alert.alert('Atenção', 'O nome do paciente não pode ficar vazio.');
      return;
    }
    editarPaciente(
      pacienteSelecionado.id,
      editPacNome.trim(),
      editPacNascimento.trim(),
      editPacResponsavel.trim()
    );
    const atualizado = {
      ...pacienteSelecionado,
      nome: editPacNome.trim(),
      data_nascimento: editPacNascimento.trim(),
      responsavel: editPacResponsavel.trim(),
    };
    setPacienteSelecionado(atualizado);
    setEditandoPaciente(false);
    carregarPacientes();
    Alert.alert('Sucesso', 'Dados do paciente atualizados!');
  };

  const selecionarMeta = (meta) => {
    setMetaAtivaId(meta.id);
    setPassosDaMeta(buscarPassosPorMeta(meta.id));
    setEditandoMetaAtual(false);
  };

  const iniciarEdicaoDaMeta = (meta) => {
    setEditMetaDesc(meta.descricao);
    setEditMetaIcone(meta.icone || 'flag');
    setEditMetaCor(meta.cor || '#2563EB');
    setEditandoMetaAtual(!editandoMetaAtual);
  };

  const handleSalvarEdicaoMeta = () => {
    if (!metaAtivaId || !editMetaDesc.trim()) return;
    editarMeta(metaAtivaId, editMetaDesc.trim(), editMetaIcone, editMetaCor);
    setEditandoMetaAtual(false);
    recarregarDadosProntuario(pacienteSelecionado.id, metaAtivaId);
    Alert.alert('Sucesso', 'Meta atualizada com sucesso!');
  };

  const handleExcluirMetaAtual = () => {
    if (!metaAtivaId) return;
    Alert.alert('Excluir Meta', 'Deseja apagar esta meta e seus passos?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          excluirMeta(metaAtivaId);
          setEditandoMetaAtual(false);
          recarregarDadosProntuario(pacienteSelecionado.id, null);
        },
      },
    ]);
  };

  const handleAdicionarMeta = () => {
    if (!novaMeta.trim() || !pacienteSelecionado) return;
    const novoId = adicionarMeta(pacienteSelecionado.id, novaMeta.trim(), iconeMeta, corMeta);
    setNovaMeta('');
    setMostrarSeletorMeta(false);
    recarregarDadosProntuario(pacienteSelecionado.id, novoId);
  };

  const handleAddPasso = (tituloPasso) => {
    if (!metaAtivaId || !pacienteSelecionado) return;
    const metaObj = metas.find((m) => m.id === metaAtivaId);
    adicionarPassoTrilha(
      metaAtivaId,
      pacienteSelecionado.id,
      tituloPasso,
      metaObj?.icone || 'star',
      metaObj?.cor || '#2563EB'
    );
    recarregarDadosProntuario(pacienteSelecionado.id, metaAtivaId);
  };

  const handleTogglePasso = (passo) => {
    alternarPassoTrilha(passo.id, passo.concluido === 0);
    recarregarDadosProntuario(pacienteSelecionado.id, metaAtivaId);
  };

  const handleDeletePasso = (passo) => {
    excluirPassoTrilha(passo.id, metaAtivaId);
    recarregarDadosProntuario(pacienteSelecionado.id, metaAtivaId);
  };

  // --- EDIÇÃO DE SESSÃO NO HISTÓRICO ---
  const abrirSessaoDoHistorico = (s) => {
    setSessaoHistoricoAberta(s);
    setModoEdicaoSessao(false);
    setEditStatus(s.status || 'realizada');
    setEditModalidade(s.modalidade || 'Presencial');
    setEditForma(s.forma || 'Individual');
    setEditSessaoMetaId(s.meta_id_real || null);
    setEditSessaoPassoId(s.passo_id || null);
    setEditData(s.data || '');
    setEditInicio(s.horario_inicio || '14:00');
    setEditFim(s.horario_termino || '14:50');
    setEditObjetivo(s.objetivo_titulo || '');
    setEditAtividade(s.atividade_realizada || '');
    setEditMaterial(s.material_utilizado || '');
    setEditRelatorio(s.relatorio_diario || '');
    setEditAnotacoes(s.anotacoes || '');

    if (s.meta_id_real) {
      setPassosSessaoEdit(buscarPassosPorMeta(s.meta_id_real));
    } else {
      setPassosSessaoEdit([]);
    }
  };

  const handleTrocarMetaNaSessao = (idNovaMeta) => {
    setEditSessaoMetaId(idNovaMeta);
    const novosPassos = buscarPassosPorMeta(idNovaMeta);
    setPassosSessaoEdit(novosPassos);
    setEditSessaoPassoId(novosPassos[0] ? novosPassos[0].id : null);
  };

  const obterDataObj = (strData) => {
    if (!strData) return new Date();
    const [ano, mes, dia] = strData.split('-').map(Number);
    return new Date(ano, mes - 1, dia, 12, 0, 0);
  };

  const obterHoraObj = (strHora) => {
    const d = new Date();
    if (!strHora || !strHora.includes(':')) return d;
    const [h, m] = strHora.split(':').map(Number);
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
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
      setEditInicio(selectedDate.toTimeString().split(' ')[0].substring(0, 5));
    } else if (modoAtual === 'fim') {
      setEditFim(selectedDate.toTimeString().split(' ')[0].substring(0, 5));
    }
  };

  const salvarEdicaoNoHistorico = () => {
    if (!sessaoHistoricoAberta || !pacienteSelecionado) return;
    atualizarSessaoCompleta(sessaoHistoricoAberta.id, {
      meta_id: editSessaoMetaId,
      passo_id: editSessaoPassoId,
      status: editStatus,
      modalidade: editModalidade,
      forma: editForma,
      objetivo_titulo: editObjetivo.trim() || 'Sessão Agendada',
      atividade_realizada: editAtividade.trim(),
      data: editData.trim(),
      horario_inicio: editInicio.trim(),
      horario_termino: editFim.trim(),
      material_utilizado: editMaterial.trim(),
      relatorio_diario: editRelatorio.trim(),
      anotacoes: editAnotacoes.trim(),
    });
    const atualizadas = listarSessoesPaciente(pacienteSelecionado.id);
    setSessoes(atualizadas);
    setSessaoHistoricoAberta(atualizadas.find((item) => item.id === sessaoHistoricoAberta.id));
    setModoEdicaoSessao(false);
    Alert.alert('Sucesso', 'Atendimento atualizado!');
  };

  const handleTogglePassoNoHistorico = (passo) => {
    alternarPassoTrilha(passo.id, passo.concluido === 0);
    if (editSessaoMetaId) {
      setPassosSessaoEdit(buscarPassosPorMeta(editSessaoMetaId));
    }
    recarregarDadosProntuario(pacienteSelecionado.id, metaAtivaId);
  };

  const excluirSessaoDoHistorico = () => {
    if (!sessaoHistoricoAberta || !pacienteSelecionado) return;
    Alert.alert('Excluir Atendimento', 'Deseja apagar este atendimento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          excluirSessao(sessaoHistoricoAberta.id);
          setSessaoHistoricoAberta(null);
          recarregarDadosProntuario(pacienteSelecionado.id, metaAtivaId);
        },
      },
    ]);
  };

  const metaAtualObj = metas.find((m) => m.id === metaAtivaId);
  const metaDaSessaoHistObj = metas.find((m) => m.id === editSessaoMetaId);
  const pacientesFiltrados = pacientes.filter((p) =>
    p.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Botão para abrir/fechar o cadastro de novo paciente */}
      <TouchableOpacity
        style={styles.btnToggleCadastro}
        onPress={() => setMostrarFormNovo(!mostrarFormNovo)}
      >
        <Ionicons name={mostrarFormNovo ? 'chevron-up' : 'person-add'} size={18} color="#FFF" />
        <Text style={styles.txtBtnToggleCadastro}>
          {mostrarFormNovo ? 'Fechar Cadastro' : 'Cadastrar Novo Paciente'}
        </Text>
      </TouchableOpacity>

      {mostrarFormNovo && (
        <View style={styles.cardFormNovo}>
          <Text style={styles.labelPequena}>Nome Completo do Paciente *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Lucas Silveira Santos"
            value={novoNome}
            onChangeText={setNovoNome}
          />

          <Text style={styles.labelPequena}>Data de Nascimento</Text>
          <TextInput
            style={styles.input}
            placeholder="DD/MM/AAAA"
            keyboardType="numeric"
            maxLength={10}
            value={novoNascimento}
            onChangeText={(txt) => setNovoNascimento(formatarDataBR(txt))}
          />

          <Text style={styles.labelPequena}>Nome do Responsável</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Maria da Silva Santos"
            value={novoResponsavel}
            onChangeText={setNovoResponsavel}
          />

          <TouchableOpacity style={styles.btnConfirmarCadastro} onPress={handleCriarPaciente}>
            <Ionicons name="checkmark-circle" size={20} color="#FFF" />
            <Text style={styles.txtBtnToggleCadastro}>Salvar Paciente</Text>
          </TouchableOpacity>
        </View>
      )}

      <TextInput
        style={styles.inputBusca}
        placeholder="Buscar paciente cadastrado..."
        value={busca}
        onChangeText={setBusca}
      />

      <FlatList
        data={pacientesFiltrados}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum paciente cadastrado.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.itemPaciente} onPress={() => abrirProntuario(item)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nomePaciente}>{item.nome}</Text>
              <Text style={styles.subTexto}>
                {item.data_nascimento ? `Nasc: ${item.data_nascimento}` : 'Nascimento não informado'}
                {item.responsavel ? ` • Resp: ${item.responsavel}` : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#64748B" />
          </TouchableOpacity>
        )}
      />

      <Modal visible={!!pacienteSelecionado} animationType="slide">
        <View style={styles.modalContainer}>
          {/* VISÃO 1: DETALHES E EDIÇÃO DE SESSÃO NO HISTÓRICO */}
          {sessaoHistoricoAberta ? (
            <View style={{ flex: 1 }}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  style={styles.btnVoltar}
                  onPress={() => setSessaoHistoricoAberta(null)}
                >
                  <Ionicons name="arrow-back" size={22} color="#2563EB" />
                  <Text style={styles.txtVoltar}>Voltar ao Prontuário</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={styles.btnIconeAcao}
                    onPress={() => setModoEdicaoSessao(!modoEdicaoSessao)}
                  >
                    <Ionicons name={modoEdicaoSessao ? 'eye-outline' : 'create-outline'} size={22} color="#2563EB" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnIconeAcao} onPress={excluirSessaoDoHistorico}>
                    <Ionicons name="trash-outline" size={22} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
                <View style={styles.secaoCard}>
                  <View style={styles.rowTopoSessao}>
                    <View
                      style={[
                        styles.badgeMetaGrande,
                        { backgroundColor: metaDaSessaoHistObj?.cor || sessaoHistoricoAberta.meta_cor || '#2563EB' },
                      ]}
                    >
                      <Ionicons
                        name={metaDaSessaoHistObj?.icone || sessaoHistoricoAberta.meta_icone || 'flag'}
                        size={22}
                        color="#FFF"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sessaoDataHora}>
                        {sessaoHistoricoAberta.data} • {sessaoHistoricoAberta.horario_inicio} às {sessaoHistoricoAberta.horario_termino} ({sessaoHistoricoAberta.status?.toUpperCase()})
                      </Text>
                      <Text style={styles.nomePaciente}>
                        {metaDaSessaoHistObj?.descricao || sessaoHistoricoAberta.meta_titulo || 'Sem meta vinculada'}
                      </Text>
                      <Text style={styles.subTexto}>
                        {sessaoHistoricoAberta.modalidade || 'Presencial'} / {sessaoHistoricoAberta.forma || 'Individual'}
                      </Text>
                    </View>
                  </View>

                  {modoEdicaoSessao ? (
                    <>
                      <Text style={styles.labelDetalhe}>Status</Text>
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

                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.labelDetalhe}>Modalidade</Text>
                          <View style={styles.rowStatusEdit}>
                            {['Presencial', 'Online'].map((mod) => (
                              <TouchableOpacity
                                key={mod}
                                style={[styles.btnMiniToggle, editModalidade === mod && styles.btnMiniAtivo]}
                                onPress={() => setEditModalidade(mod)}
                              >
                                <Text style={[styles.txtMiniToggle, editModalidade === mod && { color: '#FFF' }]}>
                                  {mod}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={styles.labelDetalhe}>Forma</Text>
                          <View style={styles.rowStatusEdit}>
                            {['Individual', 'Grupo'].map((frm) => (
                              <TouchableOpacity
                                key={frm}
                                style={[styles.btnMiniToggle, editForma === frm && styles.btnMiniAtivo]}
                                onPress={() => setEditForma(frm)}
                              >
                                <Text style={[styles.txtMiniToggle, editForma === frm && { color: '#FFF' }]}>
                                  {frm}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      </View>

                      <Text style={styles.labelDetalhe}>Meta Vinculada</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                        {metas.map((m) => {
                          const ativa = editSessaoMetaId === m.id;
                          const corM = m.cor || '#2563EB';
                          return (
                            <TouchableOpacity
                              key={m.id}
                              onPress={() => handleTrocarMetaNaSessao(m.id)}
                              style={[styles.chipPasso, ativa && { backgroundColor: corM }]}
                            >
                              <Ionicons name={m.icone || 'flag'} size={14} color={ativa ? '#FFF' : corM} />
                              <Text style={[styles.chipPassoTxt, ativa && { color: '#FFF' }]}>
                                {m.descricao}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>

                      {passosSessaoEdit.length > 0 && (
                        <>
                          <Text style={styles.labelDetalhe}>Passo da Trilha Trabalhado</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                            {passosSessaoEdit.map((p, idx) => (
                              <TouchableOpacity
                                key={p.id}
                                onPress={() => setEditSessaoPassoId(p.id)}
                                style={[
                                  styles.chipPasso,
                                  editSessaoPassoId === p.id && { backgroundColor: metaDaSessaoHistObj?.cor || '#2563EB' },
                                ]}
                              >
                                <Text style={[styles.chipPassoTxt, editSessaoPassoId === p.id && { color: '#FFF' }]}>
                                  {idx + 1}º: {p.titulo}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </>
                      )}

                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                        <View style={{ flex: 1.2 }}>
                          <Text style={styles.labelDetalhe}>Data</Text>
                          <TouchableOpacity style={styles.btnPicker} onPress={() => setPickerModo('data')}>
                            <Ionicons name="calendar-outline" size={16} color="#2563EB" />
                            <Text style={styles.txtPicker}>{editData}</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.labelDetalhe}>Início</Text>
                          <TouchableOpacity style={styles.btnPicker} onPress={() => setPickerModo('inicio')}>
                            <Ionicons name="time-outline" size={16} color="#2563EB" />
                            <Text style={styles.txtPicker}>{editInicio}</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.labelDetalhe}>Término</Text>
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

                      <Text style={styles.labelDetalhe}>Objetivo da Sessão (Título curto)</Text>
                      <TextInput style={styles.inputMeta} value={editObjetivo} onChangeText={setEditObjetivo} />

                      <Text style={styles.labelDetalhe}>Técnica ou Atividade Realizada (p/ Tabela do Relatório)</Text>
                      <TextInput
                        style={[styles.inputMeta, { height: 65, textAlignVertical: 'top' }]}
                        multiline
                        placeholder="Ex: Jogos terapêuticos para estimulação da atenção e raciocínio lógico."
                        value={editAtividade}
                        onChangeText={setEditAtividade}
                      />

                      <Text style={styles.labelDetalhe}>Material Utilizado</Text>
                      <TextInput style={styles.inputMeta} value={editMaterial} onChangeText={setEditMaterial} />

                      <Text style={styles.labelDetalhe}>Relatório Diário (Evolução)</Text>
                      <TextInput
                        style={[styles.inputMeta, { height: 70, textAlignVertical: 'top' }]}
                        multiline
                        value={editRelatorio}
                        onChangeText={setEditRelatorio}
                      />

                      <Text style={styles.labelDetalhe}>Anotações da Sessão (Privado)</Text>
                      <TextInput
                        style={[styles.inputMeta, { height: 90, textAlignVertical: 'top' }]}
                        multiline
                        value={editAnotacoes}
                        onChangeText={setEditAnotacoes}
                      />

                      <TouchableOpacity style={styles.btnSalvarHist} onPress={salvarEdicaoNoHistorico}>
                        <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Salvar Alterações</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Text style={styles.labelDetalhe}>Objetivo da Sessão</Text>
                      <Text style={styles.valorDetalhe}>{sessaoHistoricoAberta.objetivo_titulo}</Text>

                      <Text style={styles.labelDetalhe}>Técnica ou Atividade Realizada (Relatório)</Text>
                      <Text style={styles.valorDetalhe}>
                        {sessaoHistoricoAberta.atividade_realizada || 'Não informado (usará o objetivo no relatório)'}
                      </Text>

                      <Text style={styles.labelDetalhe}>Passo da Trilha Trabalhado</Text>
                      <Text style={styles.valorDetalhe}>{sessaoHistoricoAberta.passo_titulo || 'Não informado'}</Text>

                      <Text style={styles.labelDetalhe}>Material Utilizado</Text>
                      <Text style={styles.valorDetalhe}>{sessaoHistoricoAberta.material_utilizado || 'Não informado'}</Text>

                      <Text style={styles.labelDetalhe}>Relatório Diário (Evolução)</Text>
                      <Text style={styles.valorDetalhe}>{sessaoHistoricoAberta.relatorio_diario || 'Não informado'}</Text>

                      <Text style={styles.labelDetalhe}>Anotações da Sessão (Privado)</Text>
                      <Text style={styles.valorDetalhe}>{sessaoHistoricoAberta.anotacoes || 'Não informado'}</Text>
                    </>
                  )}
                </View>

                {editSessaoMetaId && (
                  <TrilhaAprendizado
                    metaTitulo={metaDaSessaoHistObj?.descricao || sessaoHistoricoAberta.meta_titulo}
                    metaAlcancada={metaDaSessaoHistObj?.alcancada === 1}
                    passos={passosSessaoEdit}
                    passoDestaqueId={editSessaoPassoId}
                    onTogglePasso={handleTogglePassoNoHistorico}
                  />
                )}
              </ScrollView>
            </View>
          ) : (
            /* VISÃO 2: PRONTUÁRIO DO PACIENTE */
            <>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitulo, { flex: 1 }]} numberOfLines={1}>
                  {pacienteSelecionado?.nome}
                </Text>
                <TouchableOpacity onPress={() => setPacienteSelecionado(null)}>
                  <Ionicons name="close-circle" size={30} color="#EF4444" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* DADOS CADASTRAIS DO PACIENTE (PARA O RELATÓRIO) */}
                <View style={styles.secaoCard}>
                  <View style={styles.rowCabecalhoEditMeta}>
                    <Text style={styles.secaoTitulo}>Dados do Paciente</Text>
                    <TouchableOpacity
                      style={styles.btnAbrirEditMeta}
                      onPress={() => setEditandoPaciente(!editandoPaciente)}
                    >
                      <Ionicons name={editandoPaciente ? 'close' : 'create-outline'} size={15} color="#2563EB" />
                      <Text style={styles.txtBtnAbrirEditMeta}>
                        {editandoPaciente ? 'Cancelar' : 'Editar Dados'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {editandoPaciente ? (
                    <View style={{ marginTop: 8 }}>
                      <Text style={styles.labelPequena}>Nome Completo</Text>
                      <TextInput
                        style={styles.inputSimples}
                        value={editPacNome}
                        onChangeText={setEditPacNome}
                      />

                      <Text style={styles.labelPequena}>Data de Nascimento</Text>
                      <TextInput
                        style={styles.inputSimples}
                        placeholder="DD/MM/AAAA"
                        keyboardType="numeric"
                        maxLength={10}
                        value={editPacNascimento}
                        onChangeText={(txt) => setEditPacNascimento(formatarDataBR(txt))}
                      />

                      <Text style={styles.labelPequena}>Responsável</Text>
                      <TextInput
                        style={styles.inputSimples}
                        placeholder="Nome completo do responsável"
                        value={editPacResponsavel}
                        onChangeText={setEditPacResponsavel}
                      />

                      <TouchableOpacity style={styles.btnSalvarHist} onPress={handleSalvarDadosPaciente}>
                        <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Salvar Dados do Paciente</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ marginTop: 6, gap: 4 }}>
                      <Text style={styles.valorDetalhe}>
                        <Text style={{ fontWeight: 'bold' }}>Nascimento:</Text>{' '}
                        {pacienteSelecionado?.data_nascimento || 'Não informado'}
                      </Text>
                      <Text style={styles.valorDetalhe}>
                        <Text style={{ fontWeight: 'bold' }}>Responsável:</Text>{' '}
                        {pacienteSelecionado?.responsavel || 'Não informado'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* METAS */}
                <View style={styles.secaoCard}>
                  <Text style={styles.secaoTitulo}>1. Metas a Alcançar</Text>
                  <View style={styles.rowMeta}>
                    <TouchableOpacity
                      style={[styles.btnIconeMeta, { backgroundColor: corMeta }]}
                      onPress={() => setMostrarSeletorMeta(!mostrarSeletorMeta)}
                    >
                      <Ionicons name={iconeMeta} size={20} color="#FFF" />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.inputMeta}
                      placeholder="Criar nova meta..."
                      value={novaMeta}
                      onChangeText={setNovaMeta}
                    />
                    <TouchableOpacity style={[styles.btnMeta, { backgroundColor: corMeta }]} onPress={handleAdicionarMeta}>
                      <Ionicons name="add" size={22} color="#FFF" />
                    </TouchableOpacity>
                  </View>

                  {mostrarSeletorMeta && (
                    <SeletorVisual
                      iconeSelecionado={iconeMeta}
                      corSelecionada={corMeta}
                      onSelectIcone={setIconeMeta}
                      onSelectCor={setCorMeta}
                    />
                  )}

                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {metas.map((meta) => {
                      const selecionada = meta.id === metaAtivaId;
                      const corDaMeta = meta.cor || '#2563EB';
                      return (
                        <TouchableOpacity
                          key={meta.id}
                          onPress={() => selecionarMeta(meta)}
                          style={[
                            styles.chipMeta,
                            selecionada && { backgroundColor: corDaMeta },
                            meta.alcancada === 1 && styles.chipMetaConcluida,
                          ]}
                        >
                          <Ionicons
                            name={meta.alcancada ? 'trophy' : (meta.icone || 'flag')}
                            size={16}
                            color={selecionada ? '#FFF' : corDaMeta}
                          />
                          <Text style={[styles.chipMetaTexto, selecionada && { color: '#FFF' }]}>
                            {meta.descricao}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {metaAtualObj && (
                    <View style={styles.boxEditarMetaExistente}>
                      <View style={styles.rowCabecalhoEditMeta}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                          <View style={[styles.miniBadgeMeta, { backgroundColor: metaAtualObj.cor || '#2563EB' }]}>
                            <Ionicons name={metaAtualObj.icone || 'flag'} size={14} color="#FFF" />
                          </View>
                          <Text style={styles.txtMetaSelecionada} numberOfLines={1}>
                            Meta ativa: {metaAtualObj.descricao}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.btnAbrirEditMeta}
                          onPress={() => iniciarEdicaoDaMeta(metaAtualObj)}
                        >
                          <Ionicons name="color-palette-outline" size={16} color="#2563EB" />
                          <Text style={styles.txtBtnAbrirEditMeta}>
                            {editandoMetaAtual ? 'Fechar' : 'Mudar Cor / Ícone'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {editandoMetaAtual && (
                        <View style={{ marginTop: 10 }}>
                          <Text style={styles.labelDetalhe}>Nome da Meta</Text>
                          <TextInput
                            style={[styles.inputMeta, { marginBottom: 10 }]}
                            value={editMetaDesc}
                            onChangeText={setEditMetaDesc}
                          />

                          <SeletorVisual
                            iconeSelecionado={editMetaIcone}
                            corSelecionada={editMetaCor}
                            onSelectIcone={setEditMetaIcone}
                            onSelectCor={setEditMetaCor}
                          />

                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                              style={[styles.btnSalvarMetaEdit, { backgroundColor: editMetaCor, flex: 1 }]}
                              onPress={handleSalvarEdicaoMeta}
                            >
                              <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Salvar Meta</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.btnExcluirMeta}
                              onPress={handleExcluirMetaAtual}
                            >
                              <Ionicons name="trash-outline" size={18} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {metaAtualObj && (
                  <View style={styles.secaoCard}>
                    <Text style={styles.secaoTitulo}>2. Passos da Trilha desta Meta</Text>
                    <TrilhaAprendizado
                      metaTitulo={metaAtualObj.descricao}
                      metaAlcancada={metaAtualObj.alcancada === 1}
                      passos={passosDaMeta}
                      onAddPasso={handleAddPasso}
                      onTogglePasso={handleTogglePasso}
                      onDeletePasso={handleDeletePasso}
                    />
                  </View>
                )}

                <View style={styles.secaoCard}>
                  <Text style={styles.secaoTitulo}>3. Histórico de Atendimentos ({sessoes.length})</Text>
                  {sessoes.map((s) => {
                    const corCard = s.meta_cor || '#2563EB';
                    const iconeCard = s.meta_icone || 'flag';
                    return (
                      <TouchableOpacity
                        key={s.id}
                        activeOpacity={0.7}
                        onPress={() => abrirSessaoDoHistorico(s)}
                        style={[styles.cardSessao, { borderLeftColor: corCard }]}
                      >
                        <View style={styles.rowHistoricoCard}>
                          <View style={[styles.badgeIconeHist, { backgroundColor: corCard }]}>
                            <Ionicons name={iconeCard} size={16} color="#FFF" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.sessaoObjetivo}>{s.objetivo_titulo}</Text>
                            <Text style={styles.sessaoDataHora}>
                              {s.data} | {s.horario_inicio} às {s.horario_termino} ({s.status})
                            </Text>
                            {s.meta_titulo ? (
                              <Text style={[styles.sessaoPasso, { color: corCard }]}>
                                {s.meta_titulo} {s.passo_titulo ? `• ${s.passo_titulo}` : ''}
                              </Text>
                            ) : null}
                          </View>
                          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC' },
  btnToggleCadastro: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 13,
    borderRadius: 10,
    marginBottom: 10,
  },
  txtBtnToggleCadastro: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  cardFormNovo: {
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 12,
  },
  labelPequena: { fontSize: 12, fontWeight: '700', color: '#475569', marginTop: 8, marginBottom: 4 },
  input: { backgroundColor: '#F8FAFC', padding: 11, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1' },
  inputSimples: { backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1' },
  btnConfirmarCadastro: {
    backgroundColor: '#16A34A',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  inputBusca: { backgroundColor: '#FFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 },
  itemPaciente: { backgroundColor: '#FFF', padding: 16, borderRadius: 10, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  nomePaciente: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  subTexto: { fontSize: 12, color: '#64748B', marginTop: 2 },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 24 },
  modalContainer: { flex: 1, padding: 16, paddingTop: 40, backgroundColor: '#F1F5F9' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitulo: { fontSize: 22, fontWeight: 'bold', color: '#0F172A' },
  secaoCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 10, marginBottom: 14 },
  secaoTitulo: { fontSize: 14, fontWeight: 'bold', color: '#1E293B', marginBottom: 6 },
  rowMeta: { flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center' },
  btnIconeMeta: { width: 42, height: 42, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  inputMeta: { flex: 1, backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1' },
  btnMeta: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14, height: 42, borderRadius: 8 },
  chipMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F1F5F9', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, marginRight: 8 },
  chipMetaConcluida: { borderWidth: 2, borderColor: '#16A34A' },
  chipMetaTexto: { fontWeight: '600', color: '#1E293B', fontSize: 13 },
  boxEditarMetaExistente: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  rowCabecalhoEditMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  miniBadgeMeta: { width: 24, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  txtMetaSelecionada: { fontSize: 13, fontWeight: '700', color: '#334155', flex: 1 },
  btnAbrirEditMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  txtBtnAbrirEditMeta: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
  btnSalvarMetaEdit: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, padding: 12, borderRadius: 8 },
  btnExcluirMeta: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  cardSessao: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, marginBottom: 8, borderLeftWidth: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  rowHistoricoCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badgeIconeHist: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sessaoObjetivo: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  sessaoDataHora: { fontSize: 12, color: '#64748B', marginTop: 2 },
  sessaoPasso: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  btnVoltar: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  txtVoltar: { fontSize: 15, fontWeight: 'bold', color: '#2563EB' },
  btnIconeAcao: { backgroundColor: '#FFF', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1' },
  rowTopoSessao: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  badgeMetaGrande: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  labelDetalhe: { fontSize: 12, fontWeight: 'bold', color: '#64748B', marginTop: 12, marginBottom: 4 },
  valorDetalhe: { fontSize: 14, color: '#1E293B', lineHeight: 20 },
  rowStatusEdit: { flexDirection: 'row', gap: 6 },
  btnStatus: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center' },
  btnRealizadaAtivo: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  btnAgendadaAtivo: { backgroundColor: '#D97706', borderColor: '#D97706' },
  txtStatus: { fontWeight: 'bold', color: '#475569' },
  btnMiniToggle: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', backgroundColor: '#F8FAFC' },
  btnMiniAtivo: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  txtMiniToggle: { fontSize: 12, fontWeight: '700', color: '#475569' },
  chipPasso: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#E2E8F0', marginRight: 8 },
  chipPassoTxt: { fontSize: 12, fontWeight: '600', color: '#1E293B' },
  btnPicker: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1' },
  txtPicker: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  btnSalvarHist: { backgroundColor: '#2563EB', padding: 13, borderRadius: 8, alignItems: 'center', marginTop: 14 },
});