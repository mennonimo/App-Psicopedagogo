import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, Platform, KeyboardAvoidingView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import {
  listarPacientes,
  buscarMetasPaciente,
  buscarPassosPorMeta,
  alternarPassoTrilha,
  salvarSessao
} from '../database/db';

export default function NovaSessaoScreen() {
  const [pacientes, setPacientes] = useState([]);
  const [pacienteId, setPacienteId] = useState(null);
  const [status, setStatus] = useState('realizada');

  // Meta e Passo da Trilha
  const [metas, setMetas] = useState([]);
  const [metaId, setMetaId] = useState(null);
  const [passos, setPassos] = useState([]);
  const [passoId, setPassoId] = useState(null);
  const [concluirPassoHoje, setConcluirPassoHoje] = useState(false);

  // Data e Hora
  const [dataObj, setDataObj] = useState(new Date());
  const [horaInicioObj, setHoraInicioObj] = useState(new Date());
  const [horaFimObj, setHoraFimObj] = useState(new Date(Date.now() + 50 * 60000));
  const [mostrarPicker, setMostrarPicker] = useState(null);

  // Campos de Texto
  const [objetivo, setObjetivo] = useState('');
  const [material, setMaterial] = useState('');
  const [relatorio, setRelatorio] = useState('');
  const [anotacoes, setAnotacoes] = useState('');

  const carregarMetasEPassos = (idPac) => {
    if (!idPac) return;
    const listaMetas = buscarMetasPaciente(idPac);
    setMetas(listaMetas);
    if (listaMetas.length > 0) {
      const primeiraMeta = listaMetas[0].id;
      setMetaId(primeiraMeta);
      const listaPassos = buscarPassosPorMeta(primeiraMeta);
      setPassos(listaPassos);
      setPassoId(listaPassos[0] ? listaPassos[0].id : null);
    } else {
      setMetaId(null);
      setPassos([]);
      setPassoId(null);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const lista = listarPacientes();
      setPacientes(lista);
      const idInicial = pacienteId || (lista[0] ? lista[0].id : null);
      if (idInicial) {
        setPacienteId(idInicial);
        carregarMetasEPassos(idInicial);
      }
    }, [pacienteId])
  );

  const handleSelecionarPaciente = (id) => {
    setPacienteId(id);
    carregarMetasEPassos(id);
  };

  const handleSelecionarMeta = (idMeta) => {
    setMetaId(idMeta);
    const listaPassos = buscarPassosPorMeta(idMeta);
    setPassos(listaPassos);
    setPassoId(listaPassos[0] ? listaPassos[0].id : null);
  };

  const formatarData = (d) => d.toISOString().split('T')[0];
  const formatarHora = (d) => d.toTimeString().split(' ')[0].substring(0, 5);

  const onChangePicker = (event, selectedDate) => {
    const tipoAtual = mostrarPicker;
    if (Platform.OS === 'android') setMostrarPicker(null);
    if (!selectedDate) return;

    if (tipoAtual === 'data') setDataObj(selectedDate);
    if (tipoAtual === 'inicio') setHoraInicioObj(selectedDate);
    if (tipoAtual === 'fim') setHoraFimObj(selectedDate);
  };

  const handleSalvar = () => {
    if (!pacienteId) {
      Alert.alert('Atenção', 'Cadastre e selecione um paciente primeiro.');
      return;
    }
    if (!objetivo.trim() && status === 'realizada') {
      Alert.alert('Atenção', 'Informe o Objetivo (Título) da sessão.');
      return;
    }

    salvarSessao({
      paciente_id: pacienteId,
      meta_id: metaId,
      passo_id: passoId,
      status,
      objetivo_titulo: objetivo.trim() || 'Sessão Agendada',
      data: formatarData(dataObj),
      horario_inicio: formatarHora(horaInicioObj),
      horario_termino: formatarHora(horaFimObj),
      material_utilizado: material.trim(),
      relatorio_diario: relatorio.trim(),
      anotacoes: anotacoes.trim(),
    });

    if (passoId && concluirPassoHoje) {
      alternarPassoTrilha(passoId, true);
    }

    Alert.alert('Sucesso', 'Atendimento salvo com sucesso!');

    setObjetivo('');
    setMaterial('');
    setRelatorio('');
    setAnotacoes('');
    setConcluirPassoHoje(false);
    carregarMetasEPassos(pacienteId);
  };

  const metaSelecionadaObj = metas.find((m) => m.id === metaId);
  const corTema = metaSelecionadaObj?.cor || '#2563EB';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
    >
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>1. Paciente *</Text>
        {pacientes.length === 0 ? (
          <Text style={styles.aviso}>Cadastre um paciente na aba "Pacientes" primeiro.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowScroll}>
            {pacientes.map((p) => {
              const ativo = p.id === pacienteId;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.chip, ativo && styles.chipAtivo]}
                  onPress={() => handleSelecionarPaciente(p.id)}
                >
                  <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>{p.nome}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <Text style={styles.label}>2. Meta Trabalhada (Define o Ícone e Cor)</Text>
        {metas.length === 0 ? (
          <Text style={styles.textoSuave}>Nenhuma meta cadastrada para este paciente.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowScroll}>
            {metas.map((m) => {
              const ativa = m.id === metaId;
              const corMeta = m.cor || '#2563EB';
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.chipComIcone,
                    ativa && { backgroundColor: corMeta, borderColor: corMeta },
                  ]}
                  onPress={() => handleSelecionarMeta(m.id)}
                >
                  <Ionicons
                    name={m.icone || 'flag'}
                    size={16}
                    color={ativa ? '#FFF' : corMeta}
                  />
                  <Text style={[styles.chipTexto, ativa && styles.chipTextoAtivo]}>
                    {m.descricao}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {metaId && (
          <>
            <Text style={styles.label}>3. Passo da Trilha Trabalhado</Text>
            {passos.length === 0 ? (
              <Text style={styles.textoSuave}>Nenhum passo cadastrado nesta meta.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowScroll}>
                {passos.map((passo, index) => {
                  const ativo = passo.id === passoId;
                  return (
                    <TouchableOpacity
                      key={passo.id}
                      style={[
                        styles.chipComIcone,
                        ativo && { backgroundColor: corTema, borderColor: corTema },
                      ]}
                      onPress={() => setPassoId(passo.id)}
                    >
                      <Ionicons
                        name={passo.concluido ? 'checkmark-circle' : 'footsteps'}
                        size={16}
                        color={ativo ? '#FFF' : passo.concluido ? '#16A34A' : '#475569'}
                      />
                      <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>
                        {index + 1}º: {passo.titulo}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </>
        )}

        {passoId && status === 'realizada' && (
          <TouchableOpacity
            style={[styles.boxConcluirPasso, concluirPassoHoje && styles.boxConcluirAtivo]}
            onPress={() => setConcluirPassoHoje(!concluirPassoHoje)}
          >
            <Ionicons
              name={concluirPassoHoje ? 'checkbox' : 'square-outline'}
              size={22}
              color={concluirPassoHoje ? '#16A34A' : '#64748B'}
            />
            <Text style={styles.textoConcluirPasso}>
              Esta etapa da trilha funcionou / foi concluída hoje
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.label}>Status do Atendimento</Text>
        <View style={styles.rowStatus}>
          <TouchableOpacity
            style={[styles.btnStatus, status === 'realizada' && styles.btnStatusRealizada]}
            onPress={() => setStatus('realizada')}
          >
            <Text style={[styles.textoStatus, status === 'realizada' && styles.textoStatusAtivo]}>
              Sessão Realizada
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnStatus, status === 'agendada' && styles.btnStatusAgendada]}
            onPress={() => setStatus('agendada')}
          >
            <Text style={[styles.textoStatus, status === 'agendada' && styles.textoStatusAtivo]}>
              Apenas Agendar
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.rowDataHora}>
          <View style={{ flex: 1.2 }}>
            <Text style={styles.label}>Data</Text>
            <TouchableOpacity style={styles.btnPicker} onPress={() => setMostrarPicker('data')}>
              <Ionicons name="calendar-outline" size={18} color="#2563EB" />
              <Text style={styles.textoPicker}>{formatarData(dataObj)}</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Início</Text>
            <TouchableOpacity style={styles.btnPicker} onPress={() => setMostrarPicker('inicio')}>
              <Ionicons name="time-outline" size={18} color="#2563EB" />
              <Text style={styles.textoPicker}>{formatarHora(horaInicioObj)}</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Término</Text>
            <TouchableOpacity style={styles.btnPicker} onPress={() => setMostrarPicker('fim')}>
              <Ionicons name="time-outline" size={18} color="#2563EB" />
              <Text style={styles.textoPicker}>{formatarHora(horaFimObj)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {mostrarPicker && (
          <DateTimePicker
            value={
              mostrarPicker === 'data'
                ? dataObj
                : mostrarPicker === 'inicio'
                ? horaInicioObj
                : horaFimObj
            }
            mode={mostrarPicker === 'data' ? 'date' : 'time'}
            is24Hour={true}
            onChange={onChangePicker}
          />
        )}

        <Text style={styles.label}>Objetivo da Sessão (Título)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Atividade de leitura guiada"
          value={objetivo}
          onChangeText={setObjetivo}
        />

        <Text style={styles.label}>Material Utilizado</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Jogos lógicos, fichas de leitura..."
          value={material}
          onChangeText={setMaterial}
        />

        <Text style={styles.label}>Relatório Diário</Text>
        <TextInput
          style={[styles.input, styles.areaTexto]}
          placeholder="Disposição e resumo do dia..."
          multiline
          numberOfLines={3}
          value={relatorio}
          onChangeText={setRelatorio}
        />

        <Text style={styles.label}>Anotações da Sessão</Text>
        <TextInput
          style={[styles.input, styles.areaTextoMaior]}
          placeholder="Observações detalhadas do atendimento..."
          multiline
          numberOfLines={4}
          value={anotacoes}
          onChangeText={setAnotacoes}
        />

        <TouchableOpacity style={[styles.btnSalvar, { backgroundColor: corTema }]} onPress={handleSalvar}>
          <Ionicons name="checkmark-circle-outline" size={22} color="#FFF" />
          <Text style={styles.textoBtnSalvar}>Salvar Atendimento</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollArea: { flex: 1, padding: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6, marginTop: 12 },
  textoSuave: { fontSize: 12, color: '#64748B', marginBottom: 6 },
  aviso: { color: '#EF4444', fontSize: 13, marginBottom: 8 },
  rowScroll: { flexDirection: 'row', marginBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: '#E2E8F0', marginRight: 8 },
  chipAtivo: { backgroundColor: '#2563EB' },
  chipComIcone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginRight: 8,
  },
  chipTexto: { color: '#334155', fontWeight: '600', fontSize: 13 },
  chipTextoAtivo: { color: '#FFFFFF' },
  boxConcluirPasso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginTop: 10,
  },
  boxConcluirAtivo: { backgroundColor: '#F0FDF4', borderColor: '#16A34A' },
  textoConcluirPasso: { fontSize: 13, fontWeight: '600', color: '#1E293B', flex: 1 },
  rowStatus: { flexDirection: 'row', gap: 10 },
  btnStatus: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', backgroundColor: '#FFF' },
  btnStatusRealizada: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  btnStatusAgendada: { backgroundColor: '#D97706', borderColor: '#D97706' },
  textoStatus: { fontWeight: '600', color: '#475569' },
  textoStatusAtivo: { color: '#FFF' },
  rowDataHora: { flexDirection: 'row', gap: 8 },
  btnPicker: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1' },
  textoPicker: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  input: { backgroundColor: '#FFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', fontSize: 14, color: '#1E293B' },
  areaTexto: { height: 75, textAlignVertical: 'top' },
  areaTextoMaior: { height: 100, textAlignVertical: 'top' },
  btnSalvar: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 16, borderRadius: 10, marginTop: 24 },
  textoBtnSalvar: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});