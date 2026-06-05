Páginas para criar o CRUD

# Home:
banner_home(json): {
title (string),
subtitle (string),
banner_image (string),
explanation[{icon: (string), description: (string)}, ...] (array),
} not null;

scenario(json): {
title (string),
explanation[{icon: (string), description: (string)}, ...] (array),
} not null;

bottlenecks[{icon: (string), title (string), description (string)}, ...] (array) not null;

performance(json): {
title (string),
subtitle (string),
topics[(string), (string), (string), ...] (array),
performance_image (string),
} not null;

how_we_work[{icon: (string), title: (string), subtile(string)}, ...] (array) not null;

blog_section_title (string) not null;

card_footer(json): {
title (string),
subtitle (string),
} not null;

---

# Depoimentos:
title (string) not null;
subtitle (string) not null;
homePageId FK not null

informative[{icon: (string), title: (string), explanation: (string)}, ...] (array) not null;

testimonials[{video_link: (string), description: (string), name: (string), position: (string), client_since: (string)}, ...] (array);

card_footer(json): {
title (string),
subtitle (string),
} not null;

---

# Como trabalhamos:
about_us(json): {
title (string),
subtitle (string),
objectives[icons: (string), title: (string), subtitle: (string)] (array),
image (string),
card_image[{icon: (string), title: (string), number: (string), text: (string)}, ...] (array),
} not null;

how_we_work(json): {
title (string),
subtitle (string),
processes[{icon: (string), title: (string), description: (string)}, ...] (array),
} not null;

ours_values(json): {
icon (string),
title (string),
description (string),
} not null;

card_footer(json): {
title (string),
subtitle (string),
} not null;

---

# Serviços:
title (string) not null;
subtitle (string) not null;
explanation (string) not null;

## Cards possuirão um formulário próprio:
cards_services(json): {
 card: {
card_id (int),
card_icon (string),
title (string),
description (string)
topics[(string), (string), (string), ...] (array),
 }, ...
};

business_accelerator(json): {
title (string),
subtitle (string),
implementation_plan[{icon: (string), title: (string), description: (string)}, ...] (array);
} not null;

results[{icon: (string), title: (string), explanation: (string)}, ...] (array) not null;

card_footer(json): {
title (string),
subtitle (string),
} not null;

---

# Clientes:
title (string) not null;
subtitle (string) not null;
homePageId FK not null;

cards_clients(json): {
icon (string),
context (string),
explanation (string),
} not null;

## Empresas possuirão um formulário próprio:
id pk not null;
companies[{segment: (string), client_image: (string), client_description: (string), client_since: (date)}, ...] (array);

card_footer(json): {
title (string),
subtitle (string),
} not null;

---

# Blog:
title (string) not null;
subtitle (string) not null;
homePageId FK not null;

## Blogs possuirão um formulário próprio:
id pk not null;
blogs[{slug: (string), segment: (string), title: (string), subtitle: (string), content: (string), blog_image: (string), views: (int)}, ...] (array);

card_footer(json): {
title (string),
subtitle (string),
} not null;

---

# Config:
description (string) not null;
cnpj (string) not null;
social_media(json): {
instagram (string),
linkedin (string),
whatsapp (string),
} not null;

contact_us(json): {
telefone (string),
email (string),
location (string),
link_maps (string),
where_we_are (string),
} not null;