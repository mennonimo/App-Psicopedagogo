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
      icone TEXT DEFAULT 'flag',
      cor TEXT DEFAULT '#2563EB',
      alcancada INTEGER DEFAULT 0,
      data_conclusao TEXT,
      FOREIGN KEY (paciente_id) REFERENCES pacientes (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS passos_trilha (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meta_id INTEGER NOT NULL,
      paciente_id INTEGER NOT NULL,
      titulo TEXT NOT NULL,
      icone TEXT DEFAULT 'footsteps',
      cor TEXT DEFAULT '#2563EB',
      concluido INTEGER DEFAULT 0,
      FOREIGN KEY (meta_id) REFERENCES metas (id) ON DELETE CASCADE,
      FOREIGN KEY (paciente_id) REFERENCES pacientes (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL,
      meta_id INTEGER,
      passo_id INTEGER,
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

  const migracoes = [
    "ALTER TABLE metas ADD COLUMN icone TEXT DEFAULT 'flag';",
    "ALTER TABLE metas ADD COLUMN cor TEXT DEFAULT '#2563EB';",
    "ALTER TABLE passos_trilha ADD COLUMN icone TEXT DEFAULT 'footsteps';",
    "ALTER TABLE passos_trilha ADD COLUMN cor TEXT DEFAULT '#2563EB';",
    "ALTER TABLE sessoes ADD COLUMN meta_id INTEGER;",
    "ALTER TABLE sessoes ADD COLUMN passo_id INTEGER;",
  ];

  migracoes.forEach((sql) => {
    try {
      db.execSync(sql);
    } catch (e) {
      // Coluna já existe
    }
  });
};

// --- PACIENTES ---
export const criarPaciente = (nome) => {
  const result = db.runSync('INSERT INTO pacientes (nome) VALUES (?)', [nome]);
  return result.lastInsertRowId;
};

export const listarPacientes = () => {
  return db.getAllSync('SELECT * FROM pacientes ORDER BY nome ASC');
};

// --- METAS E PASSOS DA TRILHA ---
export const adicionarMeta = (pacienteId, descricao, icone = 'flag', cor = '#2563EB') => {
  const result = db.runSync(
    'INSERT INTO metas (paciente_id, descricao, icone, cor) VALUES (?, ?, ?, ?)',
    [pacienteId, descricao, icone, cor]
  );
  return result.lastInsertRowId;
};

export const editarMeta = (metaId, descricao, icone, cor) => {
  return db.runSync(
    'UPDATE metas SET descricao = ?, icone = ?, cor = ? WHERE id = ?',
    [descricao, icone, cor, metaId]
  );
};

export const excluirMeta = (metaId) => {
  return db.runSync('DELETE FROM metas WHERE id = ?', [metaId]);
};

export const buscarMetasPaciente = (pacienteId) => {
  return db.getAllSync('SELECT * FROM metas WHERE paciente_id = ? ORDER BY id ASC', [pacienteId]);
};

export const adicionarPassoTrilha = (metaId, pacienteId, titulo, icone = 'star', cor = '#2563EB') => {
  const result = db.runSync(
    'INSERT INTO passos_trilha (meta_id, paciente_id, titulo, icone, cor) VALUES (?, ?, ?, ?, ?)',
    [metaId, pacienteId, titulo, icone, cor]
  );
  sincronizarStatusMeta(metaId);
  return result.lastInsertRowId;
};

export const excluirPassoTrilha = (passoId, metaId) => {
  db.runSync('DELETE FROM passos_trilha WHERE id = ?', [passoId]);
  if (metaId) sincronizarStatusMeta(metaId);
};

export const alternarPassoTrilha = (passoId, concluido) => {
  db.runSync(
    'UPDATE passos_trilha SET concluido = ? WHERE id = ?',
    [concluido ? 1 : 0, passoId]
  );
  const passo = db.getFirstSync('SELECT meta_id FROM passos_trilha WHERE id = ?', [passoId]);
  if (passo) sincronizarStatusMeta(passo.meta_id);
};

const sincronizarStatusMeta = (metaId) => {
  const passos = db.getAllSync('SELECT concluido FROM passos_trilha WHERE meta_id = ?', [metaId]);
  if (passos.length === 0) return;
  const todosConcluidos = passos.every((p) => p.concluido === 1);
  const dataConclusao = todosConcluidos ? new Date().toISOString().split('T')[0] : null;
  db.runSync(
    'UPDATE metas SET alcancada = ?, data_conclusao = ? WHERE id = ?',
    [todosConcluidos ? 1 : 0, dataConclusao, metaId]
  );
};

export const buscarPassosPorMeta = (metaId) => {
  return db.getAllSync(
    'SELECT * FROM passos_trilha WHERE meta_id = ? ORDER BY id ASC',
    [metaId]
  );
};

// --- SESSÕES E AGENDA ---
export const salvarSessao = (dados) => {
  const {
    paciente_id,
    meta_id = null,
    passo_id = null,
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
      paciente_id, meta_id, passo_id, status, objetivo_titulo, data,
      horario_inicio, horario_termino, material_utilizado, relatorio_diario, anotacoes, marco_avanco
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      paciente_id, meta_id, passo_id, status, objetivo_titulo, data,
      horario_inicio, horario_termino, material_utilizado, relatorio_diario, anotacoes, marco_avanco
    ]
  );
};

export const atualizarSessaoCompleta = (id, dados) => {
  const {
    meta_id = null,
    passo_id = null,
    status,
    objetivo_titulo,
    data,
    horario_inicio,
    horario_termino,
    material_utilizado,
    relatorio_diario,
    anotacoes,
  } = dados;

  return db.runSync(
    `UPDATE sessoes SET
      meta_id = ?, passo_id = ?, status = ?, objetivo_titulo = ?,
      data = ?, horario_inicio = ?, horario_termino = ?, material_utilizado = ?,
      relatorio_diario = ?, anotacoes = ?
     WHERE id = ?`,
    [
      meta_id, passo_id, status, objetivo_titulo,
      data, horario_inicio, horario_termino, material_utilizado,
      relatorio_diario, anotacoes, id
    ]
  );
};

export const excluirSessao = (id) => {
  return db.runSync('DELETE FROM sessoes WHERE id = ?', [id]);
};

export const listarSessoesPaciente = (pacienteId) => {
  return db.getAllSync(
    `SELECT sessoes.*, 
            pacientes.nome AS paciente_nome,
            passos_trilha.titulo AS passo_titulo, 
            passos_trilha.concluido AS passo_concluido,
            COALESCE(sessoes.meta_id, passos_trilha.meta_id) AS meta_id_real,
            metas.descricao AS meta_titulo,
            metas.icone AS meta_icone,
            metas.cor AS meta_cor,
            metas.alcancada AS meta_alcancada
     FROM sessoes
     INNER JOIN pacientes ON sessoes.paciente_id = pacientes.id
     LEFT JOIN passos_trilha ON sessoes.passo_id = passos_trilha.id
     LEFT JOIN metas ON COALESCE(sessoes.meta_id, passos_trilha.meta_id) = metas.id
     WHERE sessoes.paciente_id = ?
     ORDER BY sessoes.data DESC, sessoes.horario_inicio DESC`,
    [pacienteId]
  );
};

export const listarAgendaPorData = (dataSelecionada) => {
  return db.getAllSync(
    `SELECT sessoes.*, 
            pacientes.nome AS paciente_nome,
            passos_trilha.titulo AS passo_titulo, 
            passos_trilha.concluido AS passo_concluido,
            COALESCE(sessoes.meta_id, passos_trilha.meta_id) AS meta_id_real,
            metas.descricao AS meta_titulo,
            metas.icone AS meta_icone,
            metas.cor AS meta_cor,
            metas.alcancada AS meta_alcancada
     FROM sessoes 
     INNER JOIN pacientes ON sessoes.paciente_id = pacientes.id 
     LEFT JOIN passos_trilha ON sessoes.passo_id = passos_trilha.id
     LEFT JOIN metas ON COALESCE(sessoes.meta_id, passos_trilha.meta_id) = metas.id
     WHERE sessoes.data = ? 
     ORDER BY sessoes.horario_inicio ASC`,
    [dataSelecionada]
  );
};

export const listarDatasComSessoes = () => {
  return db.getAllSync('SELECT DISTINCT data, status FROM sessoes');
};