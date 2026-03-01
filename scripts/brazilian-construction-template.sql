-- Brazilian Residential Construction Template
-- Typical phases for a small to medium residential building (4-8 floors)
-- Based on common Brazilian construction practices

INSERT INTO activity_templates (template_name, description, is_default, activities)
VALUES (
  'Cronograma Padrão - Obra Residencial',
  'Modelo de cronograma para construção residencial (edifício de 4-8 pavimentos) seguindo práticas brasileiras',
  false,
  '[
    {
      "sequence": 1,
      "description": "Mobilização e Canteiro de Obras",
      "startOffset": 0,
      "endOffset": 14,
      "duration": 15
    },
    {
      "sequence": 2,
      "description": "Instalações Provisórias",
      "startOffset": 5,
      "endOffset": 19,
      "duration": 15
    },
    {
      "sequence": 3,
      "description": "Serviços Topográficos e Locação",
      "startOffset": 15,
      "endOffset": 19,
      "duration": 5
    },
    {
      "sequence": 4,
      "description": "Limpeza do Terreno",
      "startOffset": 15,
      "endOffset": 22,
      "duration": 8
    },
    {
      "sequence": 5,
      "description": "Terraplanagem e Escavações",
      "startOffset": 20,
      "endOffset": 34,
      "duration": 15
    },
    {
      "sequence": 6,
      "description": "Fundações - Estacas ou Sapatas",
      "startOffset": 35,
      "endOffset": 64,
      "duration": 30
    },
    {
      "sequence": 7,
      "description": "Blocos de Fundação",
      "startOffset": 50,
      "endOffset": 69,
      "duration": 20
    },
    {
      "sequence": 8,
      "description": "Vigas Baldrame",
      "startOffset": 65,
      "endOffset": 79,
      "duration": 15
    },
    {
      "sequence": 9,
      "description": "Impermeabilização Baldrame",
      "startOffset": 80,
      "endOffset": 84,
      "duration": 5
    },
    {
      "sequence": 10,
      "description": "Estrutura - Subsolo/Térreo",
      "startOffset": 85,
      "endOffset": 114,
      "duration": 30
    },
    {
      "sequence": 11,
      "description": "Estrutura - 1º ao 4º Pavimento",
      "startOffset": 115,
      "endOffset": 234,
      "duration": 120
    },
    {
      "sequence": 12,
      "description": "Estrutura - Cobertura e Caixa D''Água",
      "startOffset": 235,
      "endOffset": 254,
      "duration": 20
    },
    {
      "sequence": 13,
      "description": "Alvenaria - Subsolo/Térreo",
      "startOffset": 130,
      "endOffset": 154,
      "duration": 25
    },
    {
      "sequence": 14,
      "description": "Alvenaria - Pavimentos Tipo",
      "startOffset": 155,
      "endOffset": 274,
      "duration": 120
    },
    {
      "sequence": 15,
      "description": "Instalações Hidráulicas - Prumadas",
      "startOffset": 160,
      "endOffset": 204,
      "duration": 45
    },
    {
      "sequence": 16,
      "description": "Instalações Elétricas - Prumadas",
      "startOffset": 165,
      "endOffset": 209,
      "duration": 45
    },
    {
      "sequence": 17,
      "description": "Chapisco Externo",
      "startOffset": 210,
      "endOffset": 239,
      "duration": 30
    },
    {
      "sequence": 18,
      "description": "Instalações Hidráulicas - Ramais",
      "startOffset": 240,
      "endOffset": 299,
      "duration": 60
    },
    {
      "sequence": 19,
      "description": "Instalações Elétricas - Ramais",
      "startOffset": 245,
      "endOffset": 304,
      "duration": 60
    },
    {
      "sequence": 20,
      "description": "Contrapiso",
      "startOffset": 275,
      "endOffset": 334,
      "duration": 60
    },
    {
      "sequence": 21,
      "description": "Emboço Interno",
      "startOffset": 280,
      "endOffset": 339,
      "duration": 60
    },
    {
      "sequence": 22,
      "description": "Emboço Externo (Fachada)",
      "startOffset": 285,
      "endOffset": 329,
      "duration": 45
    },
    {
      "sequence": 23,
      "description": "Impermeabilização Banheiros e Áreas Molhadas",
      "startOffset": 330,
      "endOffset": 359,
      "duration": 30
    },
    {
      "sequence": 24,
      "description": "Revestimento Cerâmico - Pisos",
      "startOffset": 340,
      "endOffset": 399,
      "duration": 60
    },
    {
      "sequence": 25,
      "description": "Revestimento Cerâmico - Paredes",
      "startOffset": 345,
      "endOffset": 404,
      "duration": 60
    },
    {
      "sequence": 26,
      "description": "Massa Corrida e Textura",
      "startOffset": 360,
      "endOffset": 404,
      "duration": 45
    },
    {
      "sequence": 27,
      "description": "Pintura Interna",
      "startOffset": 405,
      "endOffset": 449,
      "duration": 45
    },
    {
      "sequence": 28,
      "description": "Pintura Externa (Fachada)",
      "startOffset": 410,
      "endOffset": 439,
      "duration": 30
    },
    {
      "sequence": 29,
      "description": "Esquadrias de Alumínio",
      "startOffset": 350,
      "endOffset": 409,
      "duration": 60
    },
    {
      "sequence": 30,
      "description": "Vidros",
      "startOffset": 410,
      "endOffset": 434,
      "duration": 25
    },
    {
      "sequence": 31,
      "description": "Portas de Madeira",
      "startOffset": 405,
      "endOffset": 434,
      "duration": 30
    },
    {
      "sequence": 32,
      "description": "Ferragens e Fechaduras",
      "startOffset": 435,
      "endOffset": 444,
      "duration": 10
    },
    {
      "sequence": 33,
      "description": "Louças e Metais Sanitários",
      "startOffset": 440,
      "endOffset": 459,
      "duration": 20
    },
    {
      "sequence": 34,
      "description": "Bancadas de Cozinha e Banheiros",
      "startOffset": 435,
      "endOffset": 454,
      "duration": 20
    },
    {
      "sequence": 35,
      "description": "Instalação de Equipamentos (Aquecedores, etc)",
      "startOffset": 445,
      "endOffset": 459,
      "duration": 15
    },
    {
      "sequence": 36,
      "description": "Paisagismo e Áreas Externas",
      "startOffset": 450,
      "endOffset": 479,
      "duration": 30
    },
    {
      "sequence": 37,
      "description": "Calçadas e Acessos",
      "startOffset": 455,
      "endOffset": 479,
      "duration": 25
    },
    {
      "sequence": 38,
      "description": "Limpeza Final da Obra",
      "startOffset": 460,
      "endOffset": 479,
      "duration": 20
    },
    {
      "sequence": 39,
      "description": "Vistoria e Correções",
      "startOffset": 480,
      "endOffset": 494,
      "duration": 15
    },
    {
      "sequence": 40,
      "description": "Entrega e Desmobilização",
      "startOffset": 495,
      "endOffset": 499,
      "duration": 5
    }
  ]'::jsonb
);

-- Note: If you want to update an existing template instead of getting an error,
-- first delete the old one manually or uncomment the line below:
-- DELETE FROM activity_templates WHERE template_name = 'Cronograma Padrão - Obra Residencial';
