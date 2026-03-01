-- Brazilian Single-Floor House Construction Template
-- Typical construction sequence for a casa térrea (ground-level residential house)
-- Based on common Brazilian construction practices for 80-150m² houses

INSERT INTO activity_templates (template_name, description, is_default, activities)
VALUES (
  'Cronograma - Casa Térrea',
  'Modelo de cronograma para construção de casa térrea (residência de um pavimento) seguindo práticas brasileiras',
  false,
  '[
    {
      "sequence": 1,
      "description": "Mobilização e Canteiro de Obras",
      "startOffset": 0,
      "endOffset": 9,
      "duration": 10
    },
    {
      "sequence": 2,
      "description": "Instalações Provisórias",
      "startOffset": 3,
      "endOffset": 12,
      "duration": 10
    },
    {
      "sequence": 3,
      "description": "Limpeza e Preparo do Terreno",
      "startOffset": 10,
      "endOffset": 16,
      "duration": 7
    },
    {
      "sequence": 4,
      "description": "Serviços Topográficos e Locação da Obra",
      "startOffset": 15,
      "endOffset": 18,
      "duration": 4
    },
    {
      "sequence": 5,
      "description": "Escavações e Terraplenagem",
      "startOffset": 19,
      "endOffset": 28,
      "duration": 10
    },
    {
      "sequence": 6,
      "description": "Fundações (Sapatas Corridas ou Radier)",
      "startOffset": 29,
      "endOffset": 48,
      "duration": 20
    },
    {
      "sequence": 7,
      "description": "Impermeabilização de Baldrame",
      "startOffset": 49,
      "endOffset": 52,
      "duration": 4
    },
    {
      "sequence": 8,
      "description": "Alicerce e Vigas Baldrame",
      "startOffset": 53,
      "endOffset": 65,
      "duration": 13
    },
    {
      "sequence": 9,
      "description": "Aterro e Compactação Interna",
      "startOffset": 66,
      "endOffset": 72,
      "duration": 7
    },
    {
      "sequence": 10,
      "description": "Estrutura - Pilares e Vigas",
      "startOffset": 73,
      "endOffset": 97,
      "duration": 25
    },
    {
      "sequence": 11,
      "description": "Laje de Cobertura",
      "startOffset": 98,
      "endOffset": 112,
      "duration": 15
    },
    {
      "sequence": 12,
      "description": "Alvenaria de Vedação",
      "startOffset": 90,
      "endOffset": 124,
      "duration": 35
    },
    {
      "sequence": 13,
      "description": "Estrutura do Telhado (Madeiramento)",
      "startOffset": 113,
      "endOffset": 127,
      "duration": 15
    },
    {
      "sequence": 14,
      "description": "Cobertura (Telhas e Cumeeira)",
      "startOffset": 128,
      "endOffset": 137,
      "duration": 10
    },
    {
      "sequence": 15,
      "description": "Instalações Hidráulicas - Prumadas e Ramais",
      "startOffset": 125,
      "endOffset": 154,
      "duration": 30
    },
    {
      "sequence": 16,
      "description": "Instalações Elétricas - Eletrodutos e Fiação",
      "startOffset": 130,
      "endOffset": 159,
      "duration": 30
    },
    {
      "sequence": 17,
      "description": "Contrapiso",
      "startOffset": 138,
      "endOffset": 157,
      "duration": 20
    },
    {
      "sequence": 18,
      "description": "Chapisco e Emboço Interno",
      "startOffset": 155,
      "endOffset": 179,
      "duration": 25
    },
    {
      "sequence": 19,
      "description": "Chapisco e Emboço Externo",
      "startOffset": 158,
      "endOffset": 177,
      "duration": 20
    },
    {
      "sequence": 20,
      "description": "Impermeabilização de Áreas Molhadas",
      "startOffset": 180,
      "endOffset": 189,
      "duration": 10
    },
    {
      "sequence": 21,
      "description": "Revestimento Cerâmico - Pisos",
      "startOffset": 190,
      "endOffset": 209,
      "duration": 20
    },
    {
      "sequence": 22,
      "description": "Revestimento Cerâmico - Paredes",
      "startOffset": 192,
      "endOffset": 211,
      "duration": 20
    },
    {
      "sequence": 23,
      "description": "Esquadrias de Alumínio e Vidros",
      "startOffset": 178,
      "endOffset": 202,
      "duration": 25
    },
    {
      "sequence": 24,
      "description": "Portas de Madeira",
      "startOffset": 203,
      "endOffset": 217,
      "duration": 15
    },
    {
      "sequence": 25,
      "description": "Massa Corrida e Textura",
      "startOffset": 210,
      "endOffset": 224,
      "duration": 15
    },
    {
      "sequence": 26,
      "description": "Pintura Interna",
      "startOffset": 225,
      "endOffset": 244,
      "duration": 20
    },
    {
      "sequence": 27,
      "description": "Pintura Externa",
      "startOffset": 228,
      "endOffset": 242,
      "duration": 15
    },
    {
      "sequence": 28,
      "description": "Louças, Metais e Acabamentos Sanitários",
      "startOffset": 243,
      "endOffset": 252,
      "duration": 10
    },
    {
      "sequence": 29,
      "description": "Bancadas e Armários",
      "startOffset": 245,
      "endOffset": 254,
      "duration": 10
    },
    {
      "sequence": 30,
      "description": "Ferragens e Fechaduras",
      "startOffset": 253,
      "endOffset": 257,
      "duration": 5
    },
    {
      "sequence": 31,
      "description": "Instalações de Pontos Elétricos e Luminárias",
      "startOffset": 248,
      "endOffset": 257,
      "duration": 10
    },
    {
      "sequence": 32,
      "description": "Muros e Portões",
      "startOffset": 220,
      "endOffset": 244,
      "duration": 25
    },
    {
      "sequence": 33,
      "description": "Calçadas e Piso Externo",
      "startOffset": 245,
      "endOffset": 259,
      "duration": 15
    },
    {
      "sequence": 34,
      "description": "Paisagismo e Jardins",
      "startOffset": 250,
      "endOffset": 264,
      "duration": 15
    },
    {
      "sequence": 35,
      "description": "Limpeza Final",
      "startOffset": 258,
      "endOffset": 267,
      "duration": 10
    },
    {
      "sequence": 36,
      "description": "Vistoria e Correções Finais",
      "startOffset": 268,
      "endOffset": 277,
      "duration": 10
    },
    {
      "sequence": 37,
      "description": "Entrega e Desmobilização",
      "startOffset": 278,
      "endOffset": 282,
      "duration": 5
    }
  ]'::jsonb
);

-- Note: If you want to update an existing template instead of getting an error,
-- first delete the old one manually or uncomment the line below:
-- DELETE FROM activity_templates WHERE template_name = 'Cronograma - Casa Térrea';
