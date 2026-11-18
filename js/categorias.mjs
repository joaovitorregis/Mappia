export const categorias = Object.freeze({
  buracos: { nome: 'Buracos na rua', cor: '#a84715' },
  iluminacao: { nome: 'Iluminação pública', cor: '#895d0d' },
  lixo: { nome: 'Lixo e descarte irregular', cor: '#26724c' },
  vazamentos: { nome: 'Vazamentos e esgoto a céu aberto', cor: '#1d639c' },
  alagamentos: { nome: 'Alagamentos', cor: '#5346a6' },
  outro: { nome: 'Outro problema', cor: '#5d6272' }
});
export const nomeCategoria = id => categorias[id]?.nome ?? 'Ocorrência';

export function preencherCategorias(select) {
  for (const [id, categoria] of Object.entries(categorias)) {
    select.add(new Option(categoria.nome, id));
  }
}
