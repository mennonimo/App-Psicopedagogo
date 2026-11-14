import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, Modal, ScrollView, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  criarPaciente, listarPacientes, adicionarMeta,
  alternarStatusMeta, buscarMetasPaciente, listarSessoesPaciente
} from '../database/db';

export default function PacientesScreen() {
  const [pacientes, setPacientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [novoNome, setNovoNome] = useState('');

  // Estados do Modal de Prontuário do Paciente
  const [pacienteSelecionado, setPacienteSelecionado] = useState(null);
  const [metas, setMetas] = useState([]);
  const [novaMeta, setNovaMeta] = useState('');
  const [sessoes, setSessoes] = useState([]);

  const carregarPacientes = () => {
    const lista = listarPacientes();
    setPacientes(lista);
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
    criarPaciente(novoNome.trim());
    setNovoNome('');
    carregarPacientes();
  };

  const abrirProntuario = (paciente) => {
    setPacienteSelecionado(paciente);
    setMetas(buscarMetasPaciente(paciente.id));
    setSessoes(listarSessoesPaciente(paciente.id));
  };

  const handleAdicionarMeta = () => {
    if (!novaMeta.trim() || !pacienteSelecionado) return;
    adicionarMeta(pacienteSelecionado.id, novaMeta.trim());
    setNovaMeta('');
    setMetas(buscarMetasPaciente(pacienteSelecionado.id));
  };

  const handleAlternarMeta = (meta) => {
    alternarStatusMeta(meta.id, meta.alcancada === 0);
    setMetas(buscarMetasPaciente(pacienteSelecionado.id));
  };

  const pacientesFiltrados = pacientes.filter((p) =>
    p.nome.toLowerCase().includes(busca.toLowerCase())
  );

  // Cálculo da Trilha de Avanços (% de metas concluídas)
  const totalMetas = metas.length;
  const metasConcluidas = metas.filter((m) => m.alcancada === 1).length;
  const progresso = totalMetas > 0 ? Math.round((metasConcluidas / totalMetas) * 100) : 0;

  return (
    <View style={styles.container}>
      {/* Cadastro Rápido */}
      <View style={styles.cardCadastro}>
        <TextInput
          style={styles.input}
          placeholder="Nome do novo paciente..."
          value={novoNome}
          onChangeText={setNovoNome}
        />
        <TouchableOpacity style={styles.btnAdd} onPress={handleCriarPaciente}>
          <Ionicons name="person-add" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Barra de Pesquisa */}
      <TextInput
        style={styles.inputBusca}
        placeholder="Buscar paciente cadastrado..."
        value={busca}
        onChangeText={setBusca}
      />

      {/* Lista de Pacientes */}
      <FlatList
        data={pacientesFiltrados}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum paciente cadastrado ainda.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.itemPaciente} onPress={() => abrirProntuario(item)}>
            <View>
              <Text style={styles.nomePaciente}>{item.nome}</Text>
              <Text style={styles.subTexto}>Toque para ver Trilha, Metas e Histórico</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#64748B" />
          </TouchableOpacity>
        )}
      />

      {/* Modal: Prontuário Completo do Paciente */}
      <Modal visible={!!pacienteSelecionado} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitulo}>{pacienteSelecionado?.nome}</Text>
            <TouchableOpacity onPress={() => setPacienteSelecionado(null)}>
              <Ionicons name="close-circle" size={30} color="#EF4444" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* TRILHA DE AVANÇOS */}
            <View style={styles.secaoCard}>
              <Text style={styles.secaoTitulo}>Trilha de Avanços ({progresso}%)</Text>
              <View style={styles.barraFundo}>
                <View style={[styles.barraPreenchida, { width: `${progresso}%` }]} />
              </View>
              <Text style={styles.resumoAvanco}>
                {metasConcluidas} de {totalMetas} metas alcançadas
              </Text>
            </View>

            {/* METAS A ALCANÇAR */}
            <View style={styles.secaoCard}>
              <Text style={styles.secaoTitulo}>Metas a Alcançar</Text>
              <View style={styles.rowMeta}>
                <TextInput
                  style={styles.inputMeta}
                  placeholder="Adicionar nova meta..."
                  value={novaMeta}
                  onChangeText={setNovaMeta}
                />
                <TouchableOpacity style={styles.btnMeta} onPress={handleAdicionarMeta}>
                  <Ionicons name="add" size={22} color="#FFF" />
                </TouchableOpacity>
              </View>

              {metas.map((meta) => (
                <TouchableOpacity
                  key={meta.id}
                  style={styles.itemMeta}
                  onPress={() => handleAlternarMeta(meta)}
                >
                  <Ionicons
                    name={meta.alcancada ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={meta.alcancada ? '#16A34A' : '#64748B'}
                  />
                  <Text style={[styles.textoMeta, meta.alcancada ? styles.metaConcluida : null]}>
                    {meta.descricao}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* HISTÓRICO DE SESSÕES DO PACIENTE */}
            <View style={styles.secaoCard}>
              <Text style={styles.secaoTitulo}>Histórico de Sessões ({sessoes.length})</Text>
              {sessoes.length === 0 ? (
                <Text style={styles.subTexto}>Nenhuma sessão registrada para este paciente.</Text>
              ) : (
                sessoes.map((s) => (
                  <View key={s.id} style={styles.cardSessao}>
                    <Text style={styles.sessaoObjetivo}>{s.objetivo_titulo || 'Sessão Agendada'}</Text>
                    <Text style={styles.sessaoDataHora}>
                      Data: {s.data} | {s.horario_inicio} às {s.horario_termino} ({s.status})
                    </Text>
                    {s.material_utilizado ? (
                      <Text style={styles.sessaoCampo}><Text style={styles.bold}>Material:</Text> {s.material_utilizado}</Text>
                    ) : null}
                    {s.relatorio_diario ? (
                      <Text style={styles.sessaoCampo}><Text style={styles.bold}>Relatório Diário:</Text> {s.relatorio_diario}</Text>
                    ) : null}
                    {s.anotacoes ? (
                      <Text style={styles.sessaoCampo}><Text style={styles.bold}>Anotações:</Text> {s.anotacoes}</Text>
                    ) : null}
                    {s.marco_avanco ? (
                      <Text style={styles.sessaoAvanco}>★ Avanço: {s.marco_avanco}</Text>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC' },
  cardCadastro: { flexDirection: 'row', marginBottom: 12, gap: 8 },
  input: { flex: 1, backgroundColor: '#FFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1' },
  btnAdd: { backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, borderRadius: 8 },
  inputBusca: { backgroundColor: '#FFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 },
  itemPaciente: { backgroundColor: '#FFF', padding: 16, borderRadius: 10, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  nomePaciente: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  subTexto: { fontSize: 12, color: '#64748B', marginTop: 2 },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 24 },
  modalContainer: { flex: 1, padding: 16, paddingTop: 40, backgroundColor: '#F1F5F9' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitulo: { fontSize: 22, fontWeight: 'bold', color: '#0F172A' },
  secaoCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 10, marginBottom: 14 },
  secaoTitulo: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 10 },
  barraFundo: { height: 12, backgroundColor: '#E2E8F0', borderRadius: 6, overflow: 'hidden' },
  barraPreenchida: { height: '100%', backgroundColor: '#16A34A' },
  resumoAvanco: { fontSize: 12, color: '#475569', marginTop: 6 },
  rowMeta: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  inputMeta: { flex: 1, backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1' },
  btnMeta: { backgroundColor: '#16A34A', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14, borderRadius: 8 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  textoMeta: { fontSize: 14, color: '#334155', flex: 1 },
  metaConcluida: { textDecorationLine: 'line-through', color: '#94A3B8' },
  cardSessao: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#2563EB' },
  sessaoObjetivo: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  sessaoDataHora: { fontSize: 12, color: '#64748B', marginBottom: 6 },
  sessaoCampo: { fontSize: 13, color: '#334155', marginTop: 4 },
  bold: { fontWeight: 'bold' },
  sessaoAvanco: { fontSize: 13, color: '#15803D', fontWeight: '600', marginTop: 6 },
});