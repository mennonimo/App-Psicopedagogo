import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const LISTA_ICONES = [
  'flag', 'star', 'trophy', 'rocket', 'bulb', 'book',
  'extension-puzzle', 'shapes', 'prism', 'compass', 'heart',
  'happy', 'chatbubbles', 'musical-notes', 'color-palette', 'checkmark-circle'
];

export const LISTA_CORES = [
  '#2563EB', // Azul
  '#7C3AED', // Roxo
  '#16A34A', // Verde
  '#D97706', // Laranja
  '#EF4444', // Vermelho
  '#EC4899', // Rosa
  '#0891B2', // Ciano
  '#475569', // Cinza Escuro
];

export default function SeletorVisual({ iconeSelecionado, corSelecionada, onSelectIcone, onSelectCor }) {
  return (
    <View style={styles.box}>
      <Text style={styles.subLabel}>Escolha um Ícone:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowScroll}>
        {LISTA_ICONES.map((nomeIcone) => {
          const ativo = iconeSelecionado === nomeIcone;
          return (
            <TouchableOpacity
              key={nomeIcone}
              onPress={() => onSelectIcone(nomeIcone)}
              style={[
                styles.btnIcone,
                ativo && { backgroundColor: corSelecionada, borderColor: corSelecionada },
              ]}
            >
              <Ionicons
                name={nomeIcone}
                size={20}
                color={ativo ? '#FFF' : '#475569'}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={styles.subLabel}>Escolha uma Cor:</Text>
      <View style={styles.rowCores}>
        {LISTA_CORES.map((cor) => {
          const ativa = corSelecionada === cor;
          return (
            <TouchableOpacity
              key={cor}
              onPress={() => onSelectCor(cor)}
              style={[
                styles.bolinhaCor,
                { backgroundColor: cor },
                ativa && styles.bolinhaCorAtiva,
              ]}
            >
              {ativa && <Ionicons name="checkmark" size={16} color="#FFF" />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  subLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 },
  rowScroll: { marginBottom: 10 },
  btnIcone: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rowCores: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bolinhaCor: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bolinhaCorAtiva: {
    borderWidth: 3,
    borderColor: '#0F172A',
  },
});