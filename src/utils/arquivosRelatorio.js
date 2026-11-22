import { Platform } from 'react-native';
import { File as ExpoFile } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export const MESES_EXTENSO_PT = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

const PASTA_INTERNA_RELATORIOS = `${FileSystem.documentDirectory}relatorios/`;
const PASTA_COPIA_LOCAL = `${FileSystem.documentDirectory}relatorios_cache/`;

const sanitizarNomeArquivoLocal = (nomeArquivo) => {
  const limpo = String(nomeArquivo || 'relatorio.pdf')
    .replace(/[\\/:*?"<>|]/g, '-')
    .trim();
  return limpo.toLowerCase().endsWith('.pdf') ? limpo : `${limpo}.pdf`;
};

const garantirDiretorio = async (uriDiretorio) => {
  const info = await FileSystem.getInfoAsync(uriDiretorio);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(uriDiretorio, { intermediates: true });
  }
  return uriDiretorio;
};

export const obterPastaInternaRelatorios = async () => {
  return garantirDiretorio(PASTA_INTERNA_RELATORIOS);
};

export const formatarNomePasta = (uriPasta) => {
  if (!uriPasta) return 'Nenhuma pasta selecionada';

  if (uriPasta.startsWith('file://')) {
    return 'Pasta interna do aplicativo (Relatórios)';
  }

  try {
    const decodificada = decodeURIComponent(uriPasta);
    const partesPrimary = decodificada.split('primary:');
    if (partesPrimary.length > 1) {
      const caminho = partesPrimary[partesPrimary.length - 1].replace(/^\/+/, '');
      return caminho ? `Armazenamento Interno / ${caminho}` : 'Armazenamento Interno';
    }

    const segmentos = decodificada.split('/').filter(Boolean);
    const ultimo = segmentos[segmentos.length - 1];
    return ultimo || 'Pasta selecionada no dispositivo';
  } catch (e) {
    return 'Pasta selecionada no dispositivo';
  }
};

export const selecionarPastaRelatorios = async () => {
  if (Platform.OS === 'android') {
    const permissao =
      await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

    if (!permissao.granted) {
      return { granted: false, canceled: true, uri: null };
    }

    return {
      granted: true,
      canceled: false,
      uri: permissao.directoryUri,
      isInterna: false,
    };
  }

  // Fallback para iOS: diretório interno do aplicativo
  const pastaInterna = await obterPastaInternaRelatorios();
  return {
    granted: true,
    canceled: false,
    uri: pastaInterna,
    isInterna: true,
  };
};

const extrairNomeDeUriSaf = (uri) => {
  try {
    const decodificado = decodeURIComponent(uri);
    const partes = decodificado.split('/');
    return partes[partes.length - 1] || '';
  } catch (e) {
    return '';
  }
};

const listarNomesExistentesNaPasta = async (pastaUri) => {
  if (!pastaUri) return [];
  try {
    if (Platform.OS === 'android' && pastaUri.startsWith('content://')) {
      const arquivosSaf =
        await FileSystem.StorageAccessFramework.readDirectoryAsync(pastaUri);
      return arquivosSaf.map(extrairNomeDeUriSaf).filter(Boolean);
    }

    if (pastaUri.startsWith('file://')) {
      const info = await FileSystem.getInfoAsync(pastaUri);
      if (!info.exists) return [];
      return await FileSystem.readDirectoryAsync(pastaUri);
    }
  } catch (e) {
    // Se não for possível listar a pasta física, seguimos com os registros do banco
  }
  return [];
};

export const gerarNomeArquivoUnico = async (
  dataRef = new Date(),
  nomesBanco = [],
  pastaUri = ''
) => {
  const dia = dataRef.getDate(); // Sem zero à esquerda (ex: 1)
  const mes = MESES_EXTENSO_PT[dataRef.getMonth()];
  const ano = dataRef.getFullYear();
  const base = `${dia}-${mes}-${ano}`;

  const nomesPasta = await listarNomesExistentesNaPasta(pastaUri);
  const nomesPastaInterna = await listarNomesExistentesNaPasta(PASTA_INTERNA_RELATORIOS);

  const existentes = new Set(
    [...nomesBanco, ...nomesPasta, ...nomesPastaInterna]
      .filter(Boolean)
      .map((n) => String(n).trim().toLowerCase())
  );

  let candidato = `${base}.pdf`;
  if (!existentes.has(candidato.toLowerCase())) {
    return candidato;
  }

  let contador = 2;
  while (existentes.has(`${base}-${contador}.pdf`.toLowerCase())) {
    contador += 1;
  }
  return `${base}-${contador}.pdf`;
};

const obterCaminhoCopiaLocal = (nomeArquivo) => {
  return `${PASTA_COPIA_LOCAL}${sanitizarNomeArquivoLocal(nomeArquivo)}`;
};

export const salvarPdfRelatorio = async ({
  uriTemporario,
  base64,
  nomeArquivo,
  pastaUri,
}) => {
  const nomeSeguro = sanitizarNomeArquivoLocal(nomeArquivo);
  let conteudoBase64 = base64;

  if (!conteudoBase64 && uriTemporario) {
    conteudoBase64 = await FileSystem.readAsStringAsync(uriTemporario, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  if (!conteudoBase64) {
    throw new Error('Não foi possível ler o conteúdo do PDF gerado.');
  }

  // Android com pasta SAF configurada
  if (Platform.OS === 'android' && pastaUri && pastaUri.startsWith('content://')) {
    try {
      const nomeSemExtensao = nomeSeguro.replace(/\.pdf$/i, '');
      const uriSafCriado =
        await FileSystem.StorageAccessFramework.createFileAsync(
          pastaUri,
          nomeSemExtensao,
          'application/pdf'
        );

      await FileSystem.writeAsStringAsync(uriSafCriado, conteudoBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Mantém uma cópia local para garantir compartilhamento confiável via expo-sharing
      try {
        await garantirDiretorio(PASTA_COPIA_LOCAL);
        const uriCopia = obterCaminhoCopiaLocal(nomeSeguro);
        await FileSystem.writeAsStringAsync(uriCopia, conteudoBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } catch (e) {
        // Cópia local auxiliar é opcional; compartilhamento também tenta ler do SAF
      }

      // Remove arquivo temporário gerado pelo expo-print se existir
      if (uriTemporario) {
        try {
          await FileSystem.deleteAsync(uriTemporario, { idempotent: true });
        } catch (e) {
          // Ignora falha ao limpar cache temporário
        }
      }

      return {
        uriArquivo: uriSafCriado,
        nomeArquivo: nomeSeguro,
        salvoEmSaf: true,
        fallbackInterno: false,
      };
    } catch (erroSaf) {
      // Fallback seguro para pasta interna caso a permissão SAF tenha sido revogada ou pasta removida
      const pastaInterna = await obterPastaInternaRelatorios();
      const uriDestinoLocal = `${pastaInterna}${nomeSeguro}`;
      await FileSystem.writeAsStringAsync(uriDestinoLocal, conteudoBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (uriTemporario) {
        try {
          await FileSystem.deleteAsync(uriTemporario, { idempotent: true });
        } catch (e) {}
      }

      return {
        uriArquivo: uriDestinoLocal,
        nomeArquivo: nomeSeguro,
        salvoEmSaf: false,
        fallbackInterno: true,
        avisoSaf:
          'Não foi possível gravar na pasta selecionada (verifique as permissões). O PDF foi salvo na pasta interna do aplicativo.',
      };
    }
  }

  // iOS ou Android sem pasta SAF selecionada -> salva no diretório interno do app
  const pastaInterna = await obterPastaInternaRelatorios();
  const uriDestino = `${pastaInterna}${nomeSeguro}`;

  await FileSystem.writeAsStringAsync(uriDestino, conteudoBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (uriTemporario) {
    try {
      await FileSystem.deleteAsync(uriTemporario, { idempotent: true });
    } catch (e) {}
  }

  return {
    uriArquivo: uriDestino,
    nomeArquivo: nomeSeguro,
    salvoEmSaf: false,
    fallbackInterno: false,
  };
};

const prepararArquivoLocal = async (uriArquivo, nomeArquivo) => {
  const nomeSeguro = sanitizarNomeArquivoLocal(nomeArquivo);
  let uriLocal = uriArquivo;

  if (uriArquivo && uriArquivo.startsWith('content://')) {
    const uriTempCache = `${FileSystem.cacheDirectory}${nomeSeguro}`;
    let preparado = false;

    // 1. Tenta ler diretamente do arquivo SAF e gravar em cache file://
    try {
      const base64Saf = await FileSystem.readAsStringAsync(uriArquivo, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await FileSystem.writeAsStringAsync(uriTempCache, base64Saf, {
        encoding: FileSystem.EncodingType.Base64,
      });
      uriLocal = uriTempCache;
      preparado = true;
    } catch (e) {
      // 2. Fallback para cópia local auxiliar caso o acesso SAF falhe
      const uriCopia = obterCaminhoCopiaLocal(nomeSeguro);
      const infoCopia = await FileSystem.getInfoAsync(uriCopia);
      if (infoCopia.exists) {
        uriLocal = uriCopia;
        preparado = true;
      }
    }

    if (!preparado) {
      throw new Error(
        'Não foi possível acessar o arquivo PDF na pasta do dispositivo. Verifique se ele foi movido ou excluído.'
      );
    }
  } else {
    const info = await FileSystem.getInfoAsync(uriArquivo);
    if (!info.exists) {
      const uriCopia = obterCaminhoCopiaLocal(nomeSeguro);
      const infoCopia = await FileSystem.getInfoAsync(uriCopia);
      if (infoCopia.exists) {
        uriLocal = uriCopia;
      } else {
        throw new Error('O arquivo PDF não foi encontrado no dispositivo.');
      }
    }
  }

  return { uriLocal, nomeSeguro };
};

export const abrirRelatorioPdf = async (uriArquivo, nomeArquivo) => {
  const { uriLocal, nomeSeguro } = await prepararArquivoLocal(uriArquivo, nomeArquivo);
  const arquivo = new ExpoFile(uriLocal);

  const podeVisualizar = await arquivo.canPreview({ mimeType: 'application/pdf' });
  if (!podeVisualizar) {
    throw new Error(
      'Nenhum aplicativo leitor de PDF foi encontrado neste dispositivo. Use o botão Compartilhar para enviar ou abrir o documento.'
    );
  }

  await arquivo.preview({
    title: nomeSeguro,
    mimeType: 'application/pdf',
  });
};

export const compartilharRelatorioPdf = async (uriArquivo, nomeArquivo) => {
  const disponivel = await Sharing.isAvailableAsync();
  if (!disponivel) {
    throw new Error('O compartilhamento de arquivos não está disponível neste dispositivo.');
  }

  const { uriLocal, nomeSeguro } = await prepararArquivoLocal(uriArquivo, nomeArquivo);

  await Sharing.shareAsync(uriLocal, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: `Compartilhar ${nomeSeguro}`,
  });
};

export const excluirArquivoRelatorio = async (uriArquivo, nomeArquivo) => {
  if (uriArquivo) {
    try {
      await FileSystem.deleteAsync(uriArquivo, { idempotent: true });
    } catch (e) {
      // Ignora erro caso o arquivo físico já tenha sido removido externamente
    }
  }

  if (nomeArquivo) {
    const nomeSeguro = sanitizarNomeArquivoLocal(nomeArquivo);
    const caminhosAuxiliares = [
      obterCaminhoCopiaLocal(nomeSeguro),
      `${FileSystem.cacheDirectory}${nomeSeguro}`,
    ];

    for (const caminho of caminhosAuxiliares) {
      if (caminho !== uriArquivo) {
        try {
          await FileSystem.deleteAsync(caminho, { idempotent: true });
        } catch (e) {
          // Ignora falha ao limpar cópia auxiliar
        }
      }
    }
  }
};
