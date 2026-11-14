import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('clinica_psico.db');

export const initDatabase = () => {
  db.execSync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS pacientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS metas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL,
      descricao TEXT NOT NULL,
      alcancada INTEGER DEFAULT 0,
      data_conclusao TEXT,
      FOREIGN KEY (paciente_id) REFERENCES pacientes (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL,
      status TEXT DEFAULT 'agendada',
      objetivo_titulo TEXT,
      data TEXT NOT NULL,
      horario_inicio TEXT NOT NULL,
      horario_termino TEXT NOT NULL,
      material_utilizado TEXT,
      relatorio_diario TEXT,
      anotacoes TEXT,
      marco_avanco TEXT,
      FOREIGN KEY (paciente_id) REFERENCES pacientes (id) ON DELETE CASCADE
    );
  `);
};

// --- PACIENTES ---
export const criarPaciente = (nome) => {
  const result = db.runSync('INSERT INTO pacientes (nome) VALUES (?)', [nome]);
  return result.lastInsertRowId;
};

export const listarPacientes = () => {
  return db.getAllSync('SELECT * FROM pacientes ORDER BY nome ASC');
};

// --- METAS E TRILHA DE AVANÇOS ---
export const adicionarMeta = (pacienteId, descricao) => {
  return db.runSync(
    'INSERT INTO metas (paciente_id, descricao) VALUES (?, ?)',
    [pacienteId, descricao]
  );
};

export const alternarStatusMeta = (metaId, alcancada) => {
  const dataConclusao = alcancada ? new Date().toISOString().split('T')[0] : null;
  return db.runSync(
    'UPDATE metas SET alcancada = ?, data_conclusao = ? WHERE id = ?',
    [alcancada ? 1 : 0, dataConclusao, metaId]
  );
};

export const buscarMetasPaciente = (pacienteId) => {
  return db.getAllSync('SELECT * FROM metas WHERE paciente_id = ? ORDER BY id ASC', [pacienteId]);
};

// --- SESSÕES E AGENDA ---
export const salvarSessao = (dados) => {
  const {
    paciente_id,
    status = 'realizada',
    objetivo_titulo = '',
    data,
    horario_inicio,
    horario_termino,
    material_utilizado = '',
    relatorio_diario = '',
    anotacoes = '',
    marco_avanco = ''
  } = dados;

  return db.runSync(
    `INSERT INTO sessoes (
      paciente_id, status, objetivo_titulo, data, horario_inicio, horario_termino,
      material_utilizado, relatorio_diario, anotacoes, marco_avanco
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      paciente_id, status, objetivo_titulo, data, horario_inicio, horario_termino,
      material_utilizado, relatorio_diario, anotacoes, marco_avanco
    ]
  );
};

export const listarSessoesPaciente = (pacienteId) => {
  return db.getAllSync(
    'SELECT * FROM sessoes WHERE paciente_id = ? ORDER BY data DESC, horario_inicio DESC',
    [pacienteId]
  );
};

export const listarAgendaPorData = (dataSelecionada) => {
  return db.getAllSync(
    `SELECT sessoes.*, pacientes.nome AS paciente_nome 
     FROM sessoes 
     INNER JOIN pacientes ON sessoes.paciente_id = pacientes.id 
     WHERE sessoes.data = ? 
     ORDER BY sessoes.horario_inicio ASC`,
    [dataSelecionada]
  );
};

export const listarDatasComSessoes = () => {
  return db.getAllSync('SELECT DISTINCT data, status FROM sessoes');
};