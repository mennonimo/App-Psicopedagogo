import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TrilhaAprendizado({
  metaTitulo = 'Meta Principal',
  metaAlcancada = false,
  passos = [],
  passoDestaqueId = null,
  onTogglePasso,
  onAddPasso,
  onDeletePasso,
}) {
  const [novoPasso, setNovoPasso] = useState('');

  const handleAdicionar = () => {
    if (!novoPasso.trim() || !onAddPasso) return;
    onAddPasso(novoPasso.trim());
    setNovoPasso('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerTrilha}>
        <Ionicons name="git-network-outline" size={20} color="#2563EB" />
        <Text style={styles.tituloTrilha}>Trilha para a Meta: {metaTitulo}</Text>
      </View>

      {/* Adicionar novo passo nessa trilha */}
      {onAddPasso && (
        <View style={styles.boxAdd}>
          <TextInput
            style={styles.inputAdd}
            placeholder="Adicionar passo nesta trilha (ex: Etapa 1)..."
            value={novoPasso}
            onChangeText={setNovoPasso}
          />
          <TouchableOpacity style={styles.btnAdd} onPress={handleAdicionar}>
            <Ionicons name="add" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Início da Marcha */}
      <View style={styles.pontoPartida}>
        <View style={styles.badgePartida}>
          <Ionicons name="flag" size={14} color="#FFF" />
          <Text style={styles.textoPartida}>SAÍDA</Text>
        </View>
      </View>

      {passos.length === 0 ? (
        <Text style={styles.vazio}>
          Adicione os passos acima para montar o caminho até esta meta.
        </Text>
      ) : (
        passos.map((passo, index) => {
          const ladoEsquerdo = index % 2 === 0;
          const concluido = passo.concluido === 1;
          const emDestaque = passo.id === passoDestaqueId;

          const corNo = emDestaque
            ? '#2563EB'
            : concluido
            ? '#16A34A'
            : '#94A3B8';

          const iconeNo = concluido
            ? 'checkmark-sharp'
            : emDestaque
            ? 'construct'
            : 'footsteps';

          const CardPasso = (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onTogglePasso && onTogglePasso(passo)}
              style={[
                styles.noContainer,
                ladoEsquerdo ? styles.alinharDireita : styles.alinharEsquerda,
              ]}
            >
              <View
                style={[
                  styles.circuloDuolingo,
                  { backgroundColor: corNo, borderColor: emDestaque ? '#93C5FD' : '#FFF' },
                ]}
              >
                <Ionicons name={iconeNo} size={18} color="#FFF" />
              </View>

              <View
                style={[
                  styles.cardEtapa,
                  emDestaque && styles.cardDestaqueAtual,
                  concluido && styles.cardConcluido,
                ]}
              >
                <View style={styles.topoPasso}>
                  <Text style={styles.marchaNumero}>{index + 1}º Passo</Text>
                  {onDeletePasso && (
                    <TouchableOpacity onPress={() => onDeletePasso(passo)}>
                      <Ionicons name="trash-outline" size={15} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.tituloEtapa}>{passo.titulo}</Text>
                <Text style={styles.subtituloEtapa}>
                  {concluido ? 'Concluído' : emDestaque ? 'Trabalhando nesta sessão' : 'Pendente'}
                </Text>
              </View>
            </TouchableOpacity>
          );

          return (
            <View key={passo.id} style={styles.linhaMarcha}>
              <View style={styles.colunaLado}>
                {ladoEsquerdo ? (
                  <View style={styles.ramoWrapper}>
                    <View style={{ flex: 1 }}>{CardPasso}</View>
                    <View style={[styles.bracoHorizontal, { backgroundColor: corNo }]} />
                  </View>
                ) : null}
              </View>

              <View style={styles.colunaCentro}>
                <View
                  style={[
                    styles.eixoVertical,
                    { backgroundColor: concluido ? '#16A34A' : '#CBD5E1' },
                  ]}
                />
                <View style={[styles.juntaCentral, { borderColor: corNo }]} />
              </View>

              <View style={styles.colunaLado}>
                {!ladoEsquerdo ? (
                  <View style={styles.ramoWrapper}>
                    <View style={[styles.bracoHorizontal, { backgroundColor: corNo }]} />
                    <View style={{ flex: 1 }}>{CardPasso}</View>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })
      )}

      {/* Chegada: A Meta em si */}
      <View style={styles.pontoChegada}>
        <View style={[styles.circuloTrofeu, metaAlcancada && styles.trofeuConcluido]}>
          <Ionicons
            name="trophy"
            size={24}
            color={metaAlcancada ? '#FFF' : '#F59E0B'}
          />
        </View>
        <Text style={styles.textoMetaFinal}>
          META: {metaTitulo} {metaAlcancada ? '(ALCANÇADA!)' : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginTop: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  headerTrilha: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  tituloTrilha: { fontSize: 14, fontWeight: 'bold', color: '#0F172A', flex: 1 },
  boxAdd: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  inputAdd: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },
  btnAdd: { backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14, borderRadius: 8 },
  pontoPartida: { alignItems: 'center', marginBottom: -4, zIndex: 2 },
  badgePartida: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1E293B', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  textoPartida: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  vazio: { textAlign: 'center', color: '#64748B', fontSize: 12, marginVertical: 16 },
  linhaMarcha: { flexDirection: 'row', minHeight: 105 },
  colunaLado: { flex: 1, justifyContent: 'center' },
  colunaCentro: { width: 24, alignItems: 'center', justifyContent: 'center' },
  eixoVertical: { position: 'absolute', top: 0, bottom: 0, width: 5 },
  juntaCentral: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFF', borderWidth: 3, zIndex: 2 },
  ramoWrapper: { flexDirection: 'row', alignItems: 'center' },
  bracoHorizontal: { width: 14, height: 4 },
  noContainer: { paddingVertical: 6 },
  alinharDireita: { alignItems: 'flex-end' },
  alinharEsquerda: { alignItems: 'flex-start' },
  circuloDuolingo: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', borderWidth: 2, marginBottom: 4 },
  cardEtapa: { backgroundColor: '#F8FAFC', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', width: '100%' },
  cardDestaqueAtual: { backgroundColor: '#EFF6FF', borderColor: '#2563EB', borderWidth: 2 },
  cardConcluido: { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' },
  topoPasso: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  marchaNumero: { fontSize: 10, fontWeight: 'bold', color: '#64748B' },
  tituloEtapa: { fontSize: 13, fontWeight: 'bold', color: '#1E293B', marginTop: 2 },
  subtituloEtapa: { fontSize: 10, color: '#64748B', marginTop: 2 },
  pontoChegada: { alignItems: 'center', marginTop: -2 },
  circuloTrofeu: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FEF3C7', borderWidth: 3, borderColor: '#F59E0B', justifyContent: 'center', alignItems: 'center' },
  trofeuConcluido: { backgroundColor: '#16A34A', borderColor: '#15803D' },
  textoMetaFinal: { fontSize: 12, fontWeight: 'bold', color: '#1E293B', marginTop: 6, textAlign: 'center' },
});