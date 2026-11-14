import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, Platform, KeyboardAvoidingView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { listarPacientes, salvarSessao } from '../database/db';

export default function NovaSessaoScreen({ navigation }) {
  const [pacientes, setPacientes] = useState([]);
  const [pacienteId, setPacienteId] = useState(null);
  const [status, setStatus] = useState('realizada'); // 'realizada' ou 'agendada'

  // Estados de Data e Hora
  const [dataObj, setDataObj] = useState(new Date());
  const [horaInicioObj, setHoraInicioObj] = useState(new Date());
  const [horaFimObj, setHoraFimObj] = useState(new Date(Date.now() + 50 * 60000));

  const [mostrarPicker, setMostrarPicker] = useState(null); // 'data', 'inicio', 'fim'

  // Campos da Sessão
  const [objetivo, setObjetivo] = useState('');
  const [material, setMaterial] = useState('');
  const [relatorio, setRelatorio] = useState('');
  const [anotacoes, setAnotacoes] = useState('');
  const [marcoAvanco, setMarcoAvanco] = useState('');

  useFocusEffect(
    useCallback(() => {
      const lista = listarPacientes();
      setPacientes(lista);
      if (lista.length > 0 && !pacienteId) {
        setPacienteId(lista[0].id);
      }
    }, [pacienteId])
  );

  const formatarData = (d) => d.toISOString().split('T')[0];
  const formatarHora = (d) =>
    d.toTimeString().split(' ')[0].substring(0, 5);

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
      Alert.alert('Atenção', 'Cadastre e selecione um paciente primeiro na aba Pacientes.');
      return;
    }
    if (!objetivo.trim() && status === 'realizada') {
      Alert.alert('Atenção', 'Informe o Objetivo (Título) da sessão.');
      return;
    }

    salvarSessao({
      paciente_id: pacienteId,
      status,
      objetivo_titulo: objetivo.trim() || 'Sessão Agendada',
      data: formatarData(dataObj),
      horario_inicio: formatarHora(horaInicioObj),
      horario_termino: formatarHora(horaFimObj),
      material_utilizado: material.trim(),
      relatorio_diario: relatorio.trim(),
      anotacoes: anotacoes.trim(),
      marco_avanco: marcoAvanco.trim(),
    });

    Alert.alert('Sucesso', 'Sessão registrada no prontuário!');

    setObjetivo('');
    setMaterial('');
    setRelatorio('');
    setAnotacoes('');
    setMarcoAvanco('');
  };

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
        {/* 1. SELEÇÃO DO PACIENTE */}
        <Text style={styles.label}>Paciente *</Text>
        {pacientes.length === 0 ? (
          <Text style={styles.aviso}>
            Nenhum paciente cadastrado. Vá na aba "Pacientes" para cadastrar o primeiro!
          </Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.listaPacientes}>
            {pacientes.map((p) => {
              const ativo = p.id === pacienteId;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.chipPaciente, ativo && styles.chipAtivo]}
                  onPress={() => setPacienteId(p.id)}
                >
                  <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>
                    {p.nome}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* 2. TIPO DE REGISTRO */}
        <Text style={styles.label}>Status da Sessão</Text>
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

        {/* 3. DATA E HORÁRIOS */}
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

        {/* 4. OBJETIVO DA SESSÃO */}
        <Text style={styles.label}>Objetivo da Sessão (Título)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Avaliação de atenção concentrada"
          value={objetivo}
          onChangeText={setObjetivo}
        />

        {/* 5. MATERIAL UTILIZADO */}
        <Text style={styles.label}>Material Utilizado</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Teste HTP, Baralho das Emoções..."
          value={material}
          onChangeText={setMaterial}
        />

        {/* 6. RELATÓRIO DIÁRIO */}
        <Text style={styles.label}>Relatório Diário</Text>
        <TextInput
          style={[styles.input, styles.areaTexto]}
          placeholder="Como o paciente chegou hoje, humor, disposição..."
          multiline
          numberOfLines={3}
          value={relatorio}
          onChangeText={setRelatorio}
        />

        {/* 7. ANOTAÇÕES DA SESSÃO */}
        <Text style={styles.label}>Anotações da Sessão</Text>
        <TextInput
          style={[styles.input, styles.areaTextoMaior]}
          placeholder="Anotações clínicas detalhadas, falas importantes..."
          multiline
          numberOfLines={5}
          value={anotacoes}
          onChangeText={setAnotacoes}
        />

        {/* 8. MARCO DA TRILHA DE AVANÇOS */}
        <Text style={styles.label}>Destaque na Trilha de Avanços (Opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Conseguiu concluir a atividade sem frustração"
          value={marcoAvanco}
          onChangeText={setMarcoAvanco}
        />

        {/* BOTÃO SALVAR */}
        <TouchableOpacity style={styles.btnSalvar} onPress={handleSalvar}>
          <Ionicons name="checkmark-circle-outline" size={22} color="#FFF" />
          <Text style={styles.textoBtnSalvar}>Salvar Registro da Sessão</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollArea: { flex: 1, padding: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6, marginTop: 12 },
  aviso: { color: '#EF4444', fontSize: 13, marginBottom: 8 },
  listaPacientes: { flexDirection: 'row', marginBottom: 4 },
  chipPaciente: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: '#E2E8F0', marginRight: 8 },
  chipAtivo: { backgroundColor: '#2563EB' },
  chipTexto: { color: '#334155', fontWeight: '600' },
  chipTextoAtivo: { color: '#FFFFFF' },
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
  areaTexto: { height: 80, textAlignVertical: 'top' },
  areaTextoMaior: { height: 110, textAlignVertical: 'top' },
  btnSalvar: { backgroundColor: '#2563EB', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 16, borderRadius: 10, marginTop: 24, marginBottom: 20 },
  textoBtnSalvar: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});