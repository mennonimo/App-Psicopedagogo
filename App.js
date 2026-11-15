import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { initDatabase } from './src/database/db';
import PacientesScreen from './src/screens/PacientesScreen';
import NovaSessaoScreen from './src/screens/NovaSessaoScreen';
import AgendaScreen from './src/screens/AgendaScreen';

// Telas provisórias para as outras 3 abas
const TelaTeste = ({ titulo }) => (
  <View style={styles.center}>
    <Text style={styles.text}>{titulo}</Text>
  </View>
);


const BackupScreen = () => <TelaTeste titulo="4. Backup Google Drive" />;

const Tab = createBottomTabNavigator();

function MinhasAbas() {
  // Pega a medida exata dos botões do sistema Android/iOS
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          // Soma 60px da barra + a altura exata dos botões do seu Android
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
            Backup: 'cloud-upload-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Agenda" component={AgendaScreen} />
      <Tab.Screen name="Pacientes" component={PacientesScreen} />
      <Tab.Screen name="Nova Sessão" component={NovaSessaoScreen} />
      <Tab.Screen name="Backup" component={BackupScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <MinhasAbas />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  text: { fontSize: 18, fontWeight: '600', color: '#1E293B' },
});