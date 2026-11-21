import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView, TextInput,
  TouchableOpacity, Image, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { buscarPerfilProfissional, salvarPerfilProfissional } from '../database/db';

export default function PerfilModal({ visible, onClose, onPerfilSalvo }) {
  const insets = useSafeAreaInsets();
  const [modoEdicao, setModoEdicao] = useState(false);

  const [fotoPerfil, setFotoPerfil] = useState(null);
  const [logoClinica, setLogoClinica] = useState(null);
  const [imagemRodape, setImagemRodape] = useState(null);

  const [nome, setNome] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [clinicaNome, setClinicaNome] = useState('');
  const [cidade, setCidade] = useState('');
  const [endereco, setEndereco] = useState('');
  const [instagram, setInstagram] = useState('');
  const [site, setSite] = useState('');

  useEffect(() => {
    if (visible) {
      const dados = buscarPerfilProfissional();
      setFotoPerfil(dados.foto_perfil || null);
      setLogoClinica(dados.logo_clinica || null);
      setImagemRodape(dados.imagem_rodape || null);
      setNome(dados.nome || '');
      setEspecialidade(dados.especialidade || 'Psicopedagogia');
      setCpf(dados.cpf || '');
      setTelefone(dados.telefone || '');
      setEmail(dados.email || '');
      setClinicaNome(dados.clinica_nome || '');
      setCidade(dados.cidade || '');
      setEndereco(dados.endereco || '');
      setInstagram(dados.instagram || '');
      setSite(dados.site || '');

      setModoEdicao(!dados.nome);
    }
  }, [visible]);

  const montarObjetoAtual = (sobrescrever = {}) => ({
    foto_perfil: fotoPerfil,
    logo_clinica: logoClinica,
    imagem_rodape: imagemRodape,
    nome: nome.trim(),
    especialidade: especialidade.trim() || 'Psicopedagogia',
    cpf: cpf.trim(),
    telefone: telefone.trim(),
    email: email.trim(),
    clinica_nome: clinicaNome.trim(),
    instagram: instagram.trim(),
    site: site.trim(),
    endereco: endereco.trim(),
    cidade: cidade.trim(),
    ...sobrescrever,
  });

  const escolherImagem = async (tipo) => {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert('Permissão necessária', 'Permita o acesso à galeria para escolher uma imagem.');
      return;
    }

    const isAvatar = tipo === 'foto_perfil';
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: isAvatar,
      aspect: isAvatar ? [1, 1] : undefined,
      quality: isAvatar ? 0.5 : 0.7,
      base64: true,
    });

    if (!resultado.canceled && resultado.assets && resultado.assets[0]) {
      const asset = resultado.assets[0];
      const mime = asset.mimeType || 'image/jpeg';
      const imagemFinal = asset.base64
        ? `data:${mime};base64,${asset.base64}`
        : asset.uri;

      if (tipo === 'foto_perfil') setFotoPerfil(imagemFinal);
      if (tipo === 'logo_clinica') setLogoClinica(imagemFinal);
      if (tipo === 'imagem_rodape') setImagemRodape(imagemFinal);

      if (!modoEdicao) {
        const atualizado = montarObjetoAtual({ [tipo]: imagemFinal });
        salvarPerfilProfissional(atualizado);
        if (onPerfilSalvo) onPerfilSalvo(atualizado);
      }
    }
  };

  const handleSalvar = () => {
    if (!nome.trim()) {
      Alert.alert('Atenção', 'Informe o nome do profissional.');
      return;
    }

    const dadosAtualizados = montarObjetoAtual();
    salvarPerfilProfissional(dadosAtualizados);
    if (onPerfilSalvo) onPerfilSalvo(dadosAtualizados);
    setModoEdicao(false);
    Alert.alert('Sucesso', 'Perfil profissional atualizado!');
  };

  const ItemVisualizacao = ({ icone, label, valor }) => (
    <View style={styles.linhaInfo}>
      <View style={styles.iconeInfoBox}>
        <Ionicons name={icone} size={18} color="#2563EB" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.labelInfo}>{label}</Text>
        <Text style={styles.valorInfo}>{valor || 'Não informado'}</Text>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top + 12 }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.subtitulo}>Conta & Relatórios</Text>
            <Text style={styles.titulo}>Perfil Profissional</Text>
          </View>

          <View style={styles.headerAcoes}>
            <TouchableOpacity
              style={styles.btnHeader}
              onPress={() => setModoEdicao(!modoEdicao)}
            >
              <Ionicons
                name={modoEdicao ? 'eye-outline' : 'create-outline'}
                size={22}
                color="#2563EB"
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={32} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Foto de Perfil */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              onPress={() => escolherImagem('foto_perfil')}
              activeOpacity={0.8}
              style={styles.avatarWrapper}
            >
              {fotoPerfil ? (
                <Image source={{ uri: fotoPerfil }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={50} color="#94A3B8" />
                </View>
              )}
              <View style={styles.badgeCamera}>
                <Ionicons name="camera" size={16} color="#FFF" />
              </View>
            </TouchableOpacity>

            <Text style={styles.nomeDestaque}>{nome || 'Seu Nome Profissional'}</Text>
            <Text style={styles.especDestaque}>{especialidade || 'Psicopedagogia'}</Text>

            {modoEdicao && fotoPerfil && (
              <TouchableOpacity onPress={() => setFotoPerfil(null)} style={styles.btnRemoverFoto}>
                <Text style={styles.txtRemoverFoto}>Remover foto de perfil</Text>
              </TouchableOpacity>
            )}
          </View>

          {modoEdicao ? (
            <>
              {/* DADOS DO PROFISSIONAL */}
              <View style={styles.card}>
                <Text style={styles.secaoTitulo}>Dados do Profissional</Text>

                <Text style={styles.label}>Nome Completo *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Maria Aparecida Silva"
                  value={nome}
                  onChangeText={setNome}
                />

                <Text style={styles.label}>Área / Especialidade</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Psicopedagogia"
                  value={especialidade}
                  onChangeText={setEspecialidade}
                />

                <Text style={styles.label}>CPF Profissional</Text>
                <TextInput
                  style={styles.input}
                  placeholder="000.000.000-00"
                  keyboardType="numeric"
                  value={cpf}
                  onChangeText={setCpf}
                />

                <Text style={styles.label}>Telefone Profissional</Text>
                <TextInput
                  style={styles.input}
                  placeholder="(11) 99999-9999"
                  keyboardType="phone-pad"
                  value={telefone}
                  onChangeText={setTelefone}
                />

                <Text style={styles.label}>E-mail Profissional</Text>
                <TextInput
                  style={styles.input}
                  placeholder="contato@clinica.com.br"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              {/* CLÍNICA E RODAPÉ */}
              <View style={styles.card}>
                <Text style={styles.secaoTitulo}>Clínica & Rodapé dos Relatórios</Text>

                <Text style={styles.label}>Nome da Clínica / Consultório</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Ágape Terapias Integradas"
                  value={clinicaNome}
                  onChangeText={setClinicaNome}
                />

                <Text style={styles.label}>Cidade (para assinatura)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Barueri"
                  value={cidade}
                  onChangeText={setCidade}
                />

                <Text style={styles.label}>Endereço Completo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Rua, número, bairro, cidade/UF"
                  value={endereco}
                  onChangeText={setEndereco}
                />

                <Text style={styles.label}>Instagram</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: clinica_terapias"
                  autoCapitalize="none"
                  value={instagram}
                  onChangeText={setInstagram}
                />

                <Text style={styles.label}>Site</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: www.clinica.com.br"
                  autoCapitalize="none"
                  value={site}
                  onChangeText={setSite}
                />
              </View>

              {/* IMAGENS DO PDF */}
              <View style={styles.card}>
                <Text style={styles.secaoTitulo}>Imagens do Relatório (PDF)</Text>

                <Text style={styles.label}>Logo do Cabeçalho da Clínica</Text>
                {logoClinica ? (
                  <View style={styles.previewBox}>
                    <Image source={{ uri: logoClinica }} style={styles.imgPreview} resizeMode="contain" />
                    <View style={styles.rowBotoesImg}>
                      <TouchableOpacity
                        style={styles.btnSecundario}
                        onPress={() => escolherImagem('logo_clinica')}
                      >
                        <Text style={styles.txtBtnSecundario}>Trocar Logo</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.btnPerigo}
                        onPress={() => setLogoClinica(null)}
                      >
                        <Text style={styles.txtBtnPerigo}>Remover</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.btnUpload}
                    onPress={() => escolherImagem('logo_clinica')}
                  >
                    <Ionicons name="image-outline" size={20} color="#2563EB" />
                    <Text style={styles.txtBtnUpload}>Selecionar Logo da Galeria</Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.label}>Imagem / Arte de Rodapé (Opcional)</Text>
                {imagemRodape ? (
                  <View style={styles.previewBox}>
                    <Image source={{ uri: imagemRodape }} style={styles.imgPreview} resizeMode="contain" />
                    <View style={styles.rowBotoesImg}>
                      <TouchableOpacity
                        style={styles.btnSecundario}
                        onPress={() => escolherImagem('imagem_rodape')}
                      >
                        <Text style={styles.txtBtnSecundario}>Trocar Rodapé</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.btnPerigo}
                        onPress={() => setImagemRodape(null)}
                      >
                        <Text style={styles.txtBtnPerigo}>Remover</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.btnUpload}
                    onPress={() => escolherImagem('imagem_rodape')}
                  >
                    <Ionicons name="image-outline" size={20} color="#2563EB" />
                    <Text style={styles.txtBtnUpload}>Selecionar Imagem de Rodapé</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity style={styles.btnSalvar} onPress={handleSalvar}>
                <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                <Text style={styles.txtSalvar}>Salvar Perfil</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.card}>
                <Text style={styles.secaoTitulo}>Dados do Profissional</Text>
                <ItemVisualizacao icone="card-outline" label="CPF" valor={cpf} />
                <ItemVisualizacao icone="call-outline" label="Telefone" valor={telefone} />
                <ItemVisualizacao icone="mail-outline" label="E-mail" valor={email} />
              </View>

              <View style={styles.card}>
                <Text style={styles.secaoTitulo}>Clínica & Rodapé dos Relatórios</Text>
                <ItemVisualizacao icone="business-outline" label="Clínica" valor={clinicaNome} />
                <ItemVisualizacao icone="location-outline" label="Cidade (Assinatura)" valor={cidade} />
                <ItemVisualizacao icone="map-outline" label="Endereço" valor={endereco} />
                <ItemVisualizacao icone="logo-instagram" label="Instagram" valor={instagram} />
                <ItemVisualizacao icone="globe-outline" label="Site" valor={site} />
              </View>

              <View style={styles.card}>
                <Text style={styles.secaoTitulo}>Imagens do Relatório (PDF)</Text>
                <Text style={styles.labelInfo}>Logo do Cabeçalho</Text>
                {logoClinica ? (
                  <Image source={{ uri: logoClinica }} style={styles.imgPreviewView} resizeMode="contain" />
                ) : (
                  <Text style={styles.valorVazio}>Nenhuma logo selecionada</Text>
                )}

                <Text style={[styles.labelInfo, { marginTop: 12 }]}>Imagem de Rodapé</Text>
                {imagemRodape ? (
                  <Image source={{ uri: imagemRodape }} style={styles.imgPreviewView} resizeMode="contain" />
                ) : (
                  <Text style={styles.valorVazio}>Nenhuma arte de rodapé selecionada</Text>
                )}
              </View>

              <TouchableOpacity style={styles.btnEditarGrande} onPress={() => setModoEdicao(true)}>
                <Ionicons name="create-outline" size={20} color="#2563EB" />
                <Text style={styles.txtEditarGrande}>Editar Informações e Imagens</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9', paddingHorizontal: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  subtitulo: { fontSize: 12, fontWeight: '700', color: '#2563EB', textTransform: 'uppercase' },
  titulo: { fontSize: 22, fontWeight: 'bold', color: '#0F172A' },
  headerAcoes: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnHeader: { backgroundColor: '#FFF', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  avatarSection: { alignItems: 'center', marginBottom: 18 },
  avatarWrapper: { position: 'relative', marginBottom: 10 },
  avatarImg: { width: 104, height: 104, borderRadius: 52, borderWidth: 3, borderColor: '#2563EB' },
  avatarPlaceholder: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#CBD5E1',
  },
  badgeCamera: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#2563EB',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  nomeDestaque: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  especDestaque: { fontSize: 13, color: '#64748B', marginTop: 2 },
  btnRemoverFoto: { marginTop: 6 },
  txtRemoverFoto: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secaoTitulo: { fontSize: 14, fontWeight: 'bold', color: '#1E293B', marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '700', color: '#475569', marginTop: 10, marginBottom: 4 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 11,
    fontSize: 14,
    color: '#0F172A',
  },
  linhaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconeInfoBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelInfo: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  valorInfo: { fontSize: 14, color: '#0F172A', marginTop: 1 },
  valorVazio: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  btnUpload: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  txtBtnUpload: { color: '#2563EB', fontWeight: '700', fontSize: 13 },
  previewBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  imgPreview: { width: '100%', height: 90, marginBottom: 10 },
  imgPreviewView: { width: '100%', height: 80, marginTop: 6, backgroundColor: '#F8FAFC', borderRadius: 8 },
  rowBotoesImg: { flexDirection: 'row', gap: 8, width: '100%' },
  btnSecundario: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    padding: 9,
    borderRadius: 6,
    alignItems: 'center',
  },
  txtBtnSecundario: { color: '#2563EB', fontWeight: '700', fontSize: 12 },
  btnPerigo: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 6,
    alignItems: 'center',
  },
  txtBtnPerigo: { color: '#EF4444', fontWeight: '700', fontSize: 12 },
  btnSalvar: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 15,
    borderRadius: 10,
    marginTop: 6,
  },
  txtSalvar: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  btnEditarGrande: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 10,
  },
  txtEditarGrande: { color: '#2563EB', fontSize: 15, fontWeight: 'bold' },
});