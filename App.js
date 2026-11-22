import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { initDatabase, buscarPerfilProfissional } from './src/database/db';

import AgendaScreen from './src/screens/AgendaScreen';
import PacientesScreen from './src/screens/PacientesScreen';
import NovaSessaoScreen from './src/screens/NovaSessaoScreen';
import RelatoriosScreen from './src/screens/RelatoriosScreen';
import PerfilModal from './src/components/PerfilModal';

const Tab = createBottomTabNavigator();

function MinhasAbas({ perfil, onAbrirPerfil }) {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerRight: () => (
          <TouchableOpacity
            onPress={onAbrirPerfil}
            style={styles.btnPerfilTopo}
            activeOpacity={0.7}
          >
            {perfil?.foto_perfil ? (
              <Image source={{ uri: perfil.foto_perfil }} style={styles.avatarTopo} />
            ) : (
              <Ionicons name="person-circle-outline" size={32} color="#2563EB" />
            )}
          </TouchableOpacity>
        ),
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 6,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
        },
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Agenda: 'calendar-outline',
            Pacientes: 'people-outline',
            'Nova Sessão': 'add-circle-outline',
            'Relatórios': 'document-text-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Agenda" component={AgendaScreen} />
      <Tab.Screen name="Pacientes" component={PacientesScreen} />
      <Tab.Screen name="Nova Sessão" component={NovaSessaoScreen} />
      <Tab.Screen name="Relatórios" component={RelatoriosScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [dbPronto, setDbPronto] = useState(false);
  const [perfil, setPerfil] = useState(null);
  const [modalPerfilVisivel, setModalPerfilVisivel] = useState(false);

  useEffect(() => {
    initDatabase();
    setPerfil(buscarPerfilProfissional());
    setDbPronto(true);
  }, []);

  if (!dbPronto) return null;

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <MinhasAbas
          perfil={perfil}
          onAbrirPerfil={() => setModalPerfilVisivel(true)}
        />
        <PerfilModal
          visible={modalPerfilVisivel}
          onClose={() => setModalPerfilVisivel(false)}
          onPerfilSalvo={(novoPerfil) => setPerfil(novoPerfil)}
        />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  btnPerfilTopo: { marginRight: 16 },
  avatarTopo: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#2563EB',
  },
});