-- 48 equipos Mundial 2026 — pegar en Supabase SQL Editor

INSERT INTO teams (id, name, flag_url, group_name) VALUES

-- GRUPO A
(gen_random_uuid(), 'México',                'https://flagcdn.com/w80/mx.png',    'A'),
(gen_random_uuid(), 'Sudáfrica',             'https://flagcdn.com/w80/za.png',    'A'),
(gen_random_uuid(), 'Corea del Sur',         'https://flagcdn.com/w80/kr.png',    'A'),
(gen_random_uuid(), 'Chequia',               'https://flagcdn.com/w80/cz.png',    'A'),

-- GRUPO B
(gen_random_uuid(), 'Canadá',                'https://flagcdn.com/w80/ca.png',    'B'),
(gen_random_uuid(), 'Bosnia y Herzegovina',  'https://flagcdn.com/w80/ba.png',    'B'),
(gen_random_uuid(), 'Catar',                 'https://flagcdn.com/w80/qa.png',    'B'),
(gen_random_uuid(), 'Suiza',                 'https://flagcdn.com/w80/ch.png',    'B'),

-- GRUPO C
(gen_random_uuid(), 'Brasil',                'https://flagcdn.com/w80/br.png',    'C'),
(gen_random_uuid(), 'Marruecos',             'https://flagcdn.com/w80/ma.png',    'C'),
(gen_random_uuid(), 'Haití',                 'https://flagcdn.com/w80/ht.png',    'C'),
(gen_random_uuid(), 'Escocia',               'https://flagcdn.com/w80/gb-sct.png','C'),

-- GRUPO D
(gen_random_uuid(), 'Estados Unidos',        'https://flagcdn.com/w80/us.png',    'D'),
(gen_random_uuid(), 'Paraguay',              'https://flagcdn.com/w80/py.png',    'D'),
(gen_random_uuid(), 'Australia',             'https://flagcdn.com/w80/au.png',    'D'),
(gen_random_uuid(), 'Turquía',               'https://flagcdn.com/w80/tr.png',    'D'),

-- GRUPO E
(gen_random_uuid(), 'Alemania',              'https://flagcdn.com/w80/de.png',    'E'),
(gen_random_uuid(), 'Curazao',               'https://flagcdn.com/w80/cw.png',    'E'),
(gen_random_uuid(), 'Costa de Marfil',       'https://flagcdn.com/w80/ci.png',    'E'),
(gen_random_uuid(), 'Ecuador',               'https://flagcdn.com/w80/ec.png',    'E'),

-- GRUPO F
(gen_random_uuid(), 'Países Bajos',          'https://flagcdn.com/w80/nl.png',    'F'),
(gen_random_uuid(), 'Japón',                 'https://flagcdn.com/w80/jp.png',    'F'),
(gen_random_uuid(), 'Suecia',                'https://flagcdn.com/w80/se.png',    'F'),
(gen_random_uuid(), 'Túnez',                 'https://flagcdn.com/w80/tn.png',    'F'),

-- GRUPO G
(gen_random_uuid(), 'Bélgica',               'https://flagcdn.com/w80/be.png',    'G'),
(gen_random_uuid(), 'Egipto',                'https://flagcdn.com/w80/eg.png',    'G'),
(gen_random_uuid(), 'Irán',                  'https://flagcdn.com/w80/ir.png',    'G'),
(gen_random_uuid(), 'Nueva Zelanda',         'https://flagcdn.com/w80/nz.png',    'G'),

-- GRUPO H
(gen_random_uuid(), 'España',                'https://flagcdn.com/w80/es.png',    'H'),
(gen_random_uuid(), 'Cabo Verde',            'https://flagcdn.com/w80/cv.png',    'H'),
(gen_random_uuid(), 'Arabia Saudí',          'https://flagcdn.com/w80/sa.png',    'H'),
(gen_random_uuid(), 'Uruguay',               'https://flagcdn.com/w80/uy.png',    'H'),

-- GRUPO I
(gen_random_uuid(), 'Francia',               'https://flagcdn.com/w80/fr.png',    'I'),
(gen_random_uuid(), 'Senegal',               'https://flagcdn.com/w80/sn.png',    'I'),
(gen_random_uuid(), 'Iraq',                  'https://flagcdn.com/w80/iq.png',    'I'),
(gen_random_uuid(), 'Noruega',               'https://flagcdn.com/w80/no.png',    'I'),

-- GRUPO J
(gen_random_uuid(), 'Argentina',             'https://flagcdn.com/w80/ar.png',    'J'),
(gen_random_uuid(), 'Argelia',               'https://flagcdn.com/w80/dz.png',    'J'),
(gen_random_uuid(), 'Austria',               'https://flagcdn.com/w80/at.png',    'J'),
(gen_random_uuid(), 'Jordania',              'https://flagcdn.com/w80/jo.png',    'J'),

-- GRUPO K
(gen_random_uuid(), 'Portugal',              'https://flagcdn.com/w80/pt.png',    'K'),
(gen_random_uuid(), 'RD Congo',              'https://flagcdn.com/w80/cd.png',    'K'),
(gen_random_uuid(), 'Uzbekistán',            'https://flagcdn.com/w80/uz.png',    'K'),
(gen_random_uuid(), 'Colombia',              'https://flagcdn.com/w80/co.png',    'K'),

-- GRUPO L
(gen_random_uuid(), 'Inglaterra',            'https://flagcdn.com/w80/gb-eng.png','L'),
(gen_random_uuid(), 'Croacia',               'https://flagcdn.com/w80/hr.png',    'L'),
(gen_random_uuid(), 'Ghana',                 'https://flagcdn.com/w80/gh.png',    'L'),
(gen_random_uuid(), 'Panamá',                'https://flagcdn.com/w80/pa.png',    'L');
