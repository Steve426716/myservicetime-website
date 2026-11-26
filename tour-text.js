// MyServiceTime — the words of the tutorials (tour.js), in the app's 20 languages.
// Each tour is a list of [title, text] steps, in the same order as TOURS in tour.js.

const TOUR_TEXT = {
  en: {
    ui: { step: "Step {n} of {total}", back: "Back", next: "Next", done: "Done", skip: "Skip",
      helpTitle: "Help and tutorials", helpIntro: "Pick a short tour. Each one lights up part of the app and explains it." },
    names: {
      welcome: ["Welcome tour", "The whole app in one minute"], appointments: ["Appointments and visits", "Add, find and start them"],
      tracker: ["Time tracker and calendar", "Track time, add notes, add time by hand"], events: ["Events", "Memorial, assemblies, conventions…"],
      assignments: ["Assignments", "Give tasks to yourself or others"], contacts: ["Contacts", "Call, text, GPS and visit history"],
      notes: ["Quick notes", "A notepad that saves itself"], planner: ["Schedule", "To-dos by day or by week"],
      activity: ["Activity", "What you did, week by week"], profile: ["Profile and settings", "Your account and your choices"],
    },
    welcome: [
      ["Welcome to MyServiceTime", "Let’s take a one-minute tour. You can skip it and watch it again any time from the ❓ button."],
      ["The menu", "Switch between Home, Activity and Progress here. Tap ☰ at the top left for your tools (time tracker, appointments, events…), reminders, settings, help and log out."],
      ["Your day at a glance", "Appointments today, time this week, open assignments and to-dos. Tap a box to open it."],
      ["Quick add", "Add an appointment, assignment, event, to-do, contact or note in one tap."],
      ["Your tools", "Tap ☰ and choose a tool under Tools — time tracker, appointments, events, contacts, map… Each one opens on its own page."],
      ["Turn on reminders", "Tap Start Reminders and allow notifications: your reminders come as notifications, whether the app is open or closed."],
      ["Help is always here", "Tap ❓ any time to replay this tour or learn one tool at a time. Enjoy your day!"],
    ],
    appointments: [
      ["New appointment", "Tap here to add an appointment or visit: title, date, time, contact, address and alarm reminders."],
      ["Find them fast", "Search and filter by type, date, contact or the person it’s assigned to."],
      ["Your list", "Each one shows a countdown. Start times a visit, Note keeps what happened, and the address opens GPS."],
    ],
    tracker: [
      ["Time tracker", "Write what you’re doing (and a note), then press Start. Pause any time; when you finish, you can add a note before saving."],
      ["Time calendar", "Each day shows the time you tracked. Tap a day to see its sessions and notes."],
      ["Add time by hand", "Forgot to start the timer? Add the time and what you did yourself."],
      ["Jump to any month", "Tap 📆 to choose a month and year."],
    ],
    events: [
      ["New event", "Add the Memorial, an assembly, a convention, a CO visit — or type your own name."],
      ["Repeats and reminders", "Events can repeat every 6 months or every year, last several days, and remind you a week and a day before."],
    ],
    assignments: [
      ["New assignment", "Give a task to yourself or someone in your contacts, with a due date, time and priority."],
      ["Check them off", "Tap the circle when it’s done. Send shares it by text message or email."],
    ],
    contacts: [
      ["New contact", "Save the people you visit: phone, email, address, relationship and a photo."],
      ["One-tap actions", "Call, text, get GPS directions, plan a new visit, give an assignment or see the visit history."],
    ],
    notes: [
      ["Quick notes", "Write anything here — it saves by itself. Addresses become GPS links, and “Insert address” adds a checked one."],
    ],
    planner: [
      ["Add a to-do", "Type a to-do for the day. Add a time if you want a reminder, or tick “No date” for the anytime list."],
      ["Day or week", "See one day or the whole week, with your appointments, assignments, events and tracked time together."],
    ],
    activity: [
      ["Weekly activity", "Totals for the week and, day by day, everything you wrote in the time calendar. Use ◀ ▶ to see other weeks."],
      ["Everything you did", "The full history, newest first. Filter it by time, appointments, assignments, events or contacts."],
    ],
    profile: [
      ["Your profile", "Change your picture and name, your publisher status and your country."],
      ["Settings", "Language, first day of the week, alarms, default reminders, and download a copy of your data."],
    ],
  },

  es: {
    ui: { step: "Paso {n} de {total}", back: "Atrás", next: "Siguiente", done: "Listo", skip: "Saltar",
      helpTitle: "Ayuda y tutoriales", helpIntro: "Elige un recorrido corto. Cada uno ilumina una parte de la app y la explica." },
    names: {
      welcome: ["Recorrido de bienvenida", "Toda la app en un minuto"], appointments: ["Citas y visitas", "Añadir, buscar e iniciar"],
      tracker: ["Cronómetro y calendario", "Registrar tiempo, notas, tiempo a mano"], events: ["Eventos", "Conmemoración, asambleas, congresos…"],
      assignments: ["Asignaciones", "Tareas para ti o para otros"], contacts: ["Contactos", "Llamar, mensaje, GPS e historial"],
      notes: ["Notas rápidas", "Un bloc que se guarda solo"], planner: ["Horario", "Tareas por día o por semana"],
      activity: ["Actividad", "Lo que hiciste, semana a semana"], profile: ["Perfil y ajustes", "Tu cuenta y tus preferencias"],
    },
    welcome: [
      ["Bienvenido a MyServiceTime", "Hagamos un recorrido de un minuto. Puedes saltarlo y verlo otra vez cuando quieras con el botón ❓."],
      ["El menú", "Cambia aquí entre Inicio, Actividad y Progreso. Toca ☰ arriba a la izquierda para tus herramientas (cronómetro, citas, eventos…), recordatorios, ajustes, ayuda y cerrar sesión."],
      ["Tu día de un vistazo", "Citas de hoy, tiempo de la semana, asignaciones abiertas y tareas. Toca un cuadro para abrirlo."],
      ["Añadir rápido", "Añade una cita, asignación, evento, tarea, contacto o nota con un toque."],
      ["Tus herramientas", "Toca ☰ y elige una herramienta en Herramientas: cronómetro, citas, eventos, contactos, mapa… Cada una se abre en su propia página."],
      ["Activa los recordatorios", "Toca Iniciar recordatorios y permite las notificaciones: tus recordatorios llegan como notificaciones, con la app abierta o cerrada."],
      ["La ayuda siempre está aquí", "Toca ❓ cuando quieras para repetir este recorrido o aprender una herramienta a la vez. ¡Buen día!"],
    ],
    appointments: [
      ["Nueva cita", "Toca aquí para añadir una cita o visita: título, fecha, hora, contacto, dirección y alarmas."],
      ["Encuéntralas rápido", "Busca y filtra por tipo, fecha, contacto o persona asignada."],
      ["Tu lista", "Cada una muestra una cuenta atrás. Iniciar cronometra una visita, Nota guarda lo que pasó y la dirección abre el GPS."],
    ],
    tracker: [
      ["Cronómetro", "Escribe qué haces (y una nota) y pulsa Iniciar. Pausa cuando quieras; al terminar puedes añadir una nota antes de guardar."],
      ["Calendario de tiempo", "Cada día muestra el tiempo registrado. Toca un día para ver sus sesiones y notas."],
      ["Añadir tiempo a mano", "¿Olvidaste iniciar el cronómetro? Añade tú el tiempo y lo que hiciste."],
      ["Ir a cualquier mes", "Toca 📆 para elegir mes y año."],
    ],
    events: [
      ["Nuevo evento", "Añade la Conmemoración, una asamblea, un congreso, una visita del superintendente… o escribe tu propio nombre."],
      ["Repeticiones y recordatorios", "Los eventos pueden repetirse cada 6 meses o cada año, durar varios días y avisarte una semana y un día antes."],
    ],
    assignments: [
      ["Nueva asignación", "Da una tarea a ti o a un contacto, con fecha, hora y prioridad."],
      ["Márcalas", "Toca el círculo cuando esté hecha. Enviar la comparte por mensaje o correo."],
    ],
    contacts: [
      ["Nuevo contacto", "Guarda a las personas que visitas: teléfono, correo, dirección, relación y foto."],
      ["Acciones con un toque", "Llamar, enviar mensaje, ir con GPS, planear una visita, dar una asignación o ver el historial."],
    ],
    notes: [
      ["Notas rápidas", "Escribe lo que quieras: se guarda solo. Las direcciones se vuelven enlaces GPS y “Insertar dirección” añade una verificada."],
    ],
    planner: [
      ["Añadir una tarea", "Escribe una tarea para el día. Ponle hora si quieres aviso, o marca “Sin fecha” para la lista de cualquier momento."],
      ["Día o semana", "Mira un día o toda la semana, con citas, asignaciones, eventos y tiempo registrado juntos."],
    ],
    activity: [
      ["Actividad semanal", "Totales de la semana y, día a día, todo lo que escribiste en el calendario de tiempo. Usa ◀ ▶ para otras semanas."],
      ["Todo lo que hiciste", "El historial completo, lo más reciente primero. Fíltralo por tiempo, citas, asignaciones, eventos o contactos."],
    ],
    profile: [
      ["Tu perfil", "Cambia tu foto y tu nombre, tu condición de publicador y tu país."],
      ["Ajustes", "Idioma, primer día de la semana, alarmas, recordatorios por defecto y descarga una copia de tus datos."],
    ],
  },

  fr: {
    ui: { step: "Étape {n} sur {total}", back: "Retour", next: "Suivant", done: "Terminé", skip: "Passer",
      helpTitle: "Aide et tutoriels", helpIntro: "Choisissez une courte visite. Chacune met en lumière une partie de l’app et l’explique." },
    names: {
      welcome: ["Visite de bienvenue", "Toute l’app en une minute"], appointments: ["Rendez-vous et visites", "Ajouter, trouver, démarrer"],
      tracker: ["Chrono et calendrier", "Suivre le temps, notes, temps à la main"], events: ["Événements", "Mémorial, assemblées, congrès…"],
      assignments: ["Assignations", "Des tâches pour vous ou d’autres"], contacts: ["Contacts", "Appeler, SMS, GPS et historique"],
      notes: ["Notes rapides", "Un bloc-notes qui s’enregistre seul"], planner: ["Programme", "À faire par jour ou par semaine"],
      activity: ["Activité", "Ce que vous avez fait, semaine par semaine"], profile: ["Profil et paramètres", "Votre compte et vos choix"],
    },
    welcome: [
      ["Bienvenue dans MyServiceTime", "Faisons une visite d’une minute. Vous pouvez la passer et la revoir quand vous voulez avec le bouton ❓."],
      ["Le menu", "Passez ici de l’Accueil à l’Activité et aux Progrès. Touchez ☰ en haut à gauche pour vos outils (chrono, rendez-vous, événements…), rappels, réglages, aide et déconnexion."],
      ["Votre journée en un coup d’œil", "Rendez-vous du jour, temps de la semaine, assignations ouvertes et tâches. Touchez une case pour l’ouvrir."],
      ["Ajout rapide", "Ajoutez un rendez-vous, une assignation, un événement, une tâche, un contact ou une note en un geste."],
      ["Vos outils", "Touchez ☰ et choisissez un outil sous Outils : chrono, rendez-vous, événements, contacts, carte… Chacun s’ouvre sur sa propre page."],
      ["Activez les rappels", "Touchez Lancer les rappels et autorisez les notifications : vos rappels arrivent en notification, app ouverte ou fermée."],
      ["L’aide est toujours là", "Touchez ❓ quand vous voulez pour revoir cette visite ou apprendre un outil à la fois. Bonne journée !"],
    ],
    appointments: [
      ["Nouveau rendez-vous", "Touchez ici pour ajouter un rendez-vous ou une visite : titre, date, heure, contact, adresse et alarmes."],
      ["Trouvez-les vite", "Cherchez et filtrez par type, date, contact ou personne assignée."],
      ["Votre liste", "Chacun affiche un compte à rebours. Démarrer chronomètre une visite, Note garde ce qui s’est passé, l’adresse ouvre le GPS."],
    ],
    tracker: [
      ["Chronomètre", "Écrivez ce que vous faites (et une note), puis Démarrer. Pause quand vous voulez ; en terminant, ajoutez une note avant d’enregistrer."],
      ["Calendrier du temps", "Chaque jour montre le temps suivi. Touchez un jour pour voir ses sessions et ses notes."],
      ["Ajouter du temps à la main", "Oublié de lancer le chrono ? Ajoutez vous-même le temps et ce que vous avez fait."],
      ["Aller à n’importe quel mois", "Touchez 📆 pour choisir le mois et l’année."],
    ],
    events: [
      ["Nouvel événement", "Ajoutez le Mémorial, une assemblée, un congrès, une visite du responsable de circonscription — ou votre propre nom."],
      ["Répétitions et rappels", "Un événement peut revenir tous les 6 mois ou chaque année, durer plusieurs jours et vous prévenir une semaine et un jour avant."],
    ],
    assignments: [
      ["Nouvelle assignation", "Donnez une tâche à vous-même ou à un contact, avec date, heure et priorité."],
      ["Cochez-les", "Touchez le cercle quand c’est fait. Envoyer la partage par SMS ou e-mail."],
    ],
    contacts: [
      ["Nouveau contact", "Enregistrez les personnes que vous visitez : téléphone, e-mail, adresse, lien et photo."],
      ["Actions en un geste", "Appeler, écrire, GPS, prévoir une visite, donner une assignation ou voir l’historique."],
    ],
    notes: [
      ["Notes rapides", "Écrivez ce que vous voulez : c’est enregistré tout seul. Les adresses deviennent des liens GPS ; « Insérer une adresse » en ajoute une vérifiée."],
    ],
    planner: [
      ["Ajouter une tâche", "Écrivez une tâche pour le jour. Ajoutez une heure pour un rappel, ou cochez « Sans date » pour la liste libre."],
      ["Jour ou semaine", "Voyez un jour ou toute la semaine, avec rendez-vous, assignations, événements et temps suivi ensemble."],
    ],
    activity: [
      ["Activité de la semaine", "Les totaux de la semaine et, jour par jour, tout ce que vous avez écrit dans le calendrier du temps. ◀ ▶ pour d’autres semaines."],
      ["Tout ce que vous avez fait", "L’historique complet, le plus récent en premier. Filtrez par temps, rendez-vous, assignations, événements ou contacts."],
    ],
    profile: [
      ["Votre profil", "Changez votre photo et votre nom, votre statut de proclamateur et votre pays."],
      ["Paramètres", "Langue, premier jour de la semaine, alarmes, rappels par défaut et téléchargement de vos données."],
    ],
  },

  ht: {
    ui: { step: "Etap {n} sou {total}", back: "Retounen", next: "Swivan", done: "Fini", skip: "Sote",
      helpTitle: "Èd ak leson", helpIntro: "Chwazi yon ti vizit. Chak vizit klere yon pati nan app la epi eksplike l." },
    names: {
      welcome: ["Vizit byenvini", "Tout app la nan yon minit"], appointments: ["Randevou ak vizit", "Ajoute, jwenn, kòmanse"],
      tracker: ["Kwonomèt ak kalandriye", "Swiv tan, nòt, ajoute tan ak men"], events: ["Evènman", "Memoryal, asanble, kongrè…"],
      assignments: ["Asiyasyon", "Travay pou ou oswa pou lòt moun"], contacts: ["Kontak", "Rele, mesaj, GPS ak istwa"],
      notes: ["Nòt rapid", "Yon kaye ki anrejistre pou kont li"], planner: ["Orè", "Pou fè pa jou oswa pa semèn"],
      activity: ["Aktivite", "Sa ou fè, semèn pa semèn"], profile: ["Pwofil ak paramèt", "Kont ou ak chwa ou"],
    },
    welcome: [
      ["Byenvini nan MyServiceTime", "Ann fè yon vizit yon minit. Ou ka sote l epi gade l ankò nenpòt lè ak bouton ❓ la."],
      ["Meni an", "Chanje isit la ant Akèy, Aktivite ak Pwogrè. Peze ☰ anlè agoch pou zouti ou yo (kwonomèt, randevou, evènman…), rapèl, paramèt, èd ak dekonekte."],
      ["Jounen ou yon sèl kout je", "Randevou jodi a, tan semèn nan, asiyasyon ki louvri ak pou fè. Peze yon bwat pou louvri l."],
      ["Ajoute vit", "Ajoute yon randevou, asiyasyon, evènman, pou fè, kontak oswa nòt ak yon sèl peze."],
      ["Zouti ou yo", "Peze ☰ epi chwazi yon zouti anba Zouti yo: kwonomèt, randevou, evènman, kontak, kat… Chak louvri sou pwòp paj pa l."],
      ["Limen rapèl yo", "Peze Kòmanse Rapèl epi pèmèt notifikasyon: rapèl ou yo vini kòm notifikasyon, kit app la louvri kit li fèmen."],
      ["Èd la toujou la", "Peze ❓ nenpòt lè pou gade vizit sa a ankò oswa aprann yon zouti alafwa. Pase yon bon jounen!"],
    ],
    appointments: [
      ["Nouvo randevou", "Peze isit la pou ajoute yon randevou oswa vizit: tit, dat, lè, kontak, adrès ak alam."],
      ["Jwenn yo vit", "Chèche epi filtre pa kalite, dat, kontak oswa moun ki gen asiyasyon an."],
      ["Lis ou", "Chak montre konbyen tan ki rete. Kòmanse kwonometre yon vizit, Nòt kenbe sa k te pase, adrès la louvri GPS."],
    ],
    tracker: [
      ["Kwonomèt", "Ekri sa w ap fè (ak yon nòt), epi peze Kòmanse. Fè poz nenpòt lè; lè w fini, ou ka ajoute yon nòt anvan ou anrejistre."],
      ["Kalandriye tan", "Chak jou montre tan ou swiv. Peze yon jou pou wè sesyon ak nòt li yo."],
      ["Ajoute tan ak men", "Ou bliye kòmanse kwonomèt la? Ajoute tan an ak sa ou te fè ou menm."],
      ["Ale nan nenpòt mwa", "Peze 📆 pou chwazi mwa ak ane."],
    ],
    events: [
      ["Nouvo evènman", "Ajoute Memoryal la, yon asanble, yon kongrè, vizit sipèvizè sikonskripsyon an — oswa ekri pwòp non pa w."],
      ["Repete ak rapèl", "Yon evènman ka repete chak 6 mwa oswa chak ane, dire plizyè jou, epi raple w yon semèn ak yon jou anvan."],
    ],
    assignments: [
      ["Nouvo asiyasyon", "Bay tèt ou oswa yon kontak yon travay, ak dat, lè ak priyorite."],
      ["Make yo fini", "Peze sèk la lè l fini. Voye pataje l pa mesaj oswa imèl."],
    ],
    contacts: [
      ["Nouvo kontak", "Anrejistre moun ou vizite yo: telefòn, imèl, adrès, relasyon ak foto."],
      ["Aksyon yon sèl peze", "Rele, voye mesaj, GPS, planifye yon vizit, bay yon asiyasyon oswa wè istwa vizit yo."],
    ],
    notes: [
      ["Nòt rapid", "Ekri sa ou vle — li anrejistre pou kont li. Adrès yo tounen lyen GPS, epi “Mete adrès” ajoute youn ki verifye."],
    ],
    planner: [
      ["Ajoute yon pou fè", "Ekri yon bagay pou fè jou a. Mete yon lè si ou vle yon rapèl, oswa make “San dat” pou lis nenpòt lè."],
      ["Jou oswa semèn", "Gade yon jou oswa tout semèn nan, ak randevou, asiyasyon, evènman ak tan ou swiv ansanm."],
    ],
    activity: [
      ["Aktivite semèn nan", "Total semèn nan epi, jou pa jou, tout sa ou ekri nan kalandriye tan an. Sèvi ak ◀ ▶ pou lòt semèn."],
      ["Tout sa ou fè", "Tout istwa a, sa ki pi resan an anvan. Filtre l pa tan, randevou, asiyasyon, evènman oswa kontak."],
    ],
    profile: [
      ["Pwofil ou", "Chanje foto w ak non w, estati w kòm pwoklamatè ak peyi w."],
      ["Paramèt", "Lang, premye jou semèn nan, alam, rapèl pa defo, epi telechaje yon kopi done ou."],
    ],
  },

  pt: {
    ui: { step: "Passo {n} de {total}", back: "Voltar", next: "Próximo", done: "Pronto", skip: "Pular",
      helpTitle: "Ajuda e tutoriais", helpIntro: "Escolha um tour curto. Cada um destaca uma parte do app e explica." },
    names: {
      welcome: ["Tour de boas-vindas", "O app inteiro em um minuto"], appointments: ["Compromissos e visitas", "Adicionar, achar e iniciar"],
      tracker: ["Cronômetro e calendário", "Registrar tempo, notas, tempo à mão"], events: ["Eventos", "Celebração, assembleias, congressos…"],
      assignments: ["Designações", "Tarefas para você ou outros"], contacts: ["Contatos", "Ligar, mensagem, GPS e histórico"],
      notes: ["Notas rápidas", "Um bloco que salva sozinho"], planner: ["Agenda", "Tarefas por dia ou semana"],
      activity: ["Atividade", "O que você fez, semana a semana"], profile: ["Perfil e configurações", "Sua conta e suas escolhas"],
    },
    welcome: [
      ["Bem-vindo ao MyServiceTime", "Vamos fazer um tour de um minuto. Você pode pular e ver de novo quando quiser no botão ❓."],
      ["O menu", "Alterne aqui entre Início, Atividade e Progresso. Toque em ☰ no canto superior esquerdo para suas ferramentas (cronômetro, compromissos, eventos…), lembretes, ajustes, ajuda e sair."],
      ["Seu dia num relance", "Compromissos de hoje, tempo da semana, designações abertas e tarefas. Toque num quadro para abrir."],
      ["Adicionar rápido", "Adicione compromisso, designação, evento, tarefa, contato ou nota com um toque."],
      ["Suas ferramentas", "Toque em ☰ e escolha uma ferramenta em Ferramentas: cronômetro, compromissos, eventos, contatos, mapa… Cada uma abre na sua própria página."],
      ["Ative os lembretes", "Toque em Iniciar lembretes e permita as notificações: seus lembretes chegam como notificações, com o app aberto ou fechado."],
      ["A ajuda está sempre aqui", "Toque em ❓ quando quiser para rever este tour ou aprender uma ferramenta por vez. Bom dia!"],
    ],
    appointments: [
      ["Novo compromisso", "Toque aqui para adicionar um compromisso ou visita: título, data, hora, contato, endereço e alarmes."],
      ["Encontre rápido", "Pesquise e filtre por tipo, data, contato ou pessoa designada."],
      ["Sua lista", "Cada um mostra uma contagem regressiva. Iniciar cronometra a visita, Nota guarda o que aconteceu e o endereço abre o GPS."],
    ],
    tracker: [
      ["Cronômetro", "Escreva o que está fazendo (e uma nota) e toque em Iniciar. Pause quando quiser; ao finalizar, adicione uma nota antes de salvar."],
      ["Calendário de tempo", "Cada dia mostra o tempo registrado. Toque num dia para ver as sessões e notas."],
      ["Adicionar tempo à mão", "Esqueceu de iniciar o cronômetro? Adicione você mesmo o tempo e o que fez."],
      ["Ir a qualquer mês", "Toque em 📆 para escolher mês e ano."],
    ],
    events: [
      ["Novo evento", "Adicione a Celebração, uma assembleia, um congresso, a visita do superintendente — ou digite seu próprio nome."],
      ["Repetição e lembretes", "Eventos podem repetir a cada 6 meses ou todo ano, durar vários dias e avisar uma semana e um dia antes."],
    ],
    assignments: [
      ["Nova designação", "Dê uma tarefa a você ou a um contato, com data, hora e prioridade."],
      ["Marque como feita", "Toque no círculo quando terminar. Enviar compartilha por mensagem ou e-mail."],
    ],
    contacts: [
      ["Novo contato", "Salve as pessoas que você visita: telefone, e-mail, endereço, relação e foto."],
      ["Ações com um toque", "Ligar, mandar mensagem, GPS, planejar visita, dar uma designação ou ver o histórico."],
    ],
    notes: [
      ["Notas rápidas", "Escreva o que quiser — salva sozinho. Endereços viram links de GPS e “Inserir endereço” adiciona um verificado."],
    ],
    planner: [
      ["Adicionar tarefa", "Escreva uma tarefa para o dia. Ponha um horário para ter lembrete, ou marque “Sem data” para a lista livre."],
      ["Dia ou semana", "Veja um dia ou a semana toda, com compromissos, designações, eventos e tempo registrado juntos."],
    ],
    activity: [
      ["Atividade semanal", "Totais da semana e, dia a dia, tudo o que você escreveu no calendário de tempo. Use ◀ ▶ para outras semanas."],
      ["Tudo o que você fez", "O histórico completo, mais recente primeiro. Filtre por tempo, compromissos, designações, eventos ou contatos."],
    ],
    profile: [
      ["Seu perfil", "Mude sua foto e seu nome, sua condição de publicador e seu país."],
      ["Configurações", "Idioma, primeiro dia da semana, alarmes, lembretes padrão e baixar uma cópia dos seus dados."],
    ],
  },

  de: {
    ui: { step: "Schritt {n} von {total}", back: "Zurück", next: "Weiter", done: "Fertig", skip: "Überspringen",
      helpTitle: "Hilfe und Anleitungen", helpIntro: "Wähle einen kurzen Rundgang. Jeder hebt einen Teil der App hervor und erklärt ihn." },
    names: {
      welcome: ["Willkommensrundgang", "Die ganze App in einer Minute"], appointments: ["Termine und Besuche", "Anlegen, finden, starten"],
      tracker: ["Zeiterfassung und Kalender", "Zeit, Notizen, Zeit von Hand"], events: ["Ereignisse", "Gedächtnismahl, Kongresse…"],
      assignments: ["Aufgaben", "Für dich oder andere"], contacts: ["Kontakte", "Anrufen, SMS, GPS, Verlauf"],
      notes: ["Schnellnotizen", "Ein Notizblock, der selbst speichert"], planner: ["Zeitplan", "To-dos nach Tag oder Woche"],
      activity: ["Aktivität", "Was du getan hast, Woche für Woche"], profile: ["Profil und Einstellungen", "Dein Konto und deine Wahl"],
    },
    welcome: [
      ["Willkommen bei MyServiceTime", "Machen wir einen Rundgang von einer Minute. Du kannst ihn überspringen und jederzeit über ❓ wiederholen."],
      ["Das Menü", "Wechsle hier zwischen Start, Verlauf und Fortschritt. Tippe oben links auf ☰ für deine Werkzeuge (Zeiterfassung, Termine, Ereignisse…), Erinnerungen, Einstellungen, Hilfe und Abmelden."],
      ["Dein Tag auf einen Blick", "Termine heute, Zeit diese Woche, offene Aufgaben und To-dos. Tippe auf ein Feld, um es zu öffnen."],
      ["Schnell hinzufügen", "Termin, Aufgabe, Ereignis, To-do, Kontakt oder Notiz mit einem Tipp anlegen."],
      ["Deine Werkzeuge", "Tippe auf ☰ und wähle unter Werkzeuge: Zeiterfassung, Termine, Ereignisse, Kontakte, Karte… Jedes öffnet sich auf einer eigenen Seite."],
      ["Erinnerungen einschalten", "Tippe auf Erinnerungen starten und erlaube Benachrichtigungen: Deine Erinnerungen kommen als Benachrichtigung, ob die App offen oder geschlossen ist."],
      ["Hilfe ist immer da", "Tippe jederzeit auf ❓, um diesen Rundgang zu wiederholen oder ein Werkzeug nach dem anderen zu lernen. Schönen Tag!"],
    ],
    appointments: [
      ["Neuer Termin", "Tippe hier, um einen Termin oder Besuch anzulegen: Titel, Datum, Uhrzeit, Kontakt, Adresse und Alarme."],
      ["Schnell finden", "Suche und filtere nach Art, Datum, Kontakt oder zugewiesener Person."],
      ["Deine Liste", "Jeder zeigt einen Countdown. Start misst einen Besuch, Notiz hält fest, was war, und die Adresse öffnet das GPS."],
    ],
    tracker: [
      ["Zeiterfassung", "Schreib, was du tust (und eine Notiz), dann Start. Pausiere jederzeit; beim Beenden kannst du vor dem Speichern eine Notiz hinzufügen."],
      ["Zeitkalender", "Jeder Tag zeigt die erfasste Zeit. Tippe auf einen Tag für seine Sitzungen und Notizen."],
      ["Zeit von Hand hinzufügen", "Timer vergessen? Füge die Zeit und was du gemacht hast selbst hinzu."],
      ["Zu jedem Monat springen", "Tippe auf 📆, um Monat und Jahr zu wählen."],
    ],
    events: [
      ["Neues Ereignis", "Füge das Gedächtnismahl, einen Kongress, einen Kreiskongress, den Besuch des Kreisaufsehers hinzu – oder einen eigenen Namen."],
      ["Wiederholung und Erinnerung", "Ereignisse können sich alle 6 Monate oder jährlich wiederholen, mehrere Tage dauern und eine Woche und einen Tag vorher erinnern."],
    ],
    assignments: [
      ["Neue Aufgabe", "Gib dir oder einem Kontakt eine Aufgabe, mit Datum, Uhrzeit und Priorität."],
      ["Abhaken", "Tippe auf den Kreis, wenn sie erledigt ist. Senden teilt sie per SMS oder E-Mail."],
    ],
    contacts: [
      ["Neuer Kontakt", "Speichere die Menschen, die du besuchst: Telefon, E-Mail, Adresse, Beziehung und Foto."],
      ["Aktionen mit einem Tipp", "Anrufen, schreiben, GPS, Besuch planen, Aufgabe geben oder den Besuchsverlauf sehen."],
    ],
    notes: [
      ["Schnellnotizen", "Schreib, was du willst – es speichert sich selbst. Adressen werden GPS-Links; „Adresse einfügen“ fügt eine geprüfte ein."],
    ],
    planner: [
      ["To-do hinzufügen", "Schreib ein To-do für den Tag. Mit Uhrzeit gibt es eine Erinnerung, oder hake „Ohne Datum“ für die freie Liste an."],
      ["Tag oder Woche", "Sieh einen Tag oder die ganze Woche, mit Terminen, Aufgaben, Ereignissen und erfasster Zeit zusammen."],
    ],
    activity: [
      ["Wochenaktivität", "Die Summen der Woche und Tag für Tag alles, was du in den Zeitkalender geschrieben hast. ◀ ▶ für andere Wochen."],
      ["Alles, was du getan hast", "Der ganze Verlauf, Neuestes zuerst. Filtere nach Zeit, Terminen, Aufgaben, Ereignissen oder Kontakten."],
    ],
    profile: [
      ["Dein Profil", "Ändere dein Foto und deinen Namen, deinen Verkündigerstatus und dein Land."],
      ["Einstellungen", "Sprache, erster Wochentag, Alarme, Standard-Erinnerungen und eine Kopie deiner Daten herunterladen."],
    ],
  },

  it: {
    ui: { step: "Passo {n} di {total}", back: "Indietro", next: "Avanti", done: "Fatto", skip: "Salta",
      helpTitle: "Aiuto e tutorial", helpIntro: "Scegli una breve visita. Ognuna illumina una parte dell’app e la spiega." },
    names: {
      welcome: ["Visita di benvenuto", "Tutta l’app in un minuto"], appointments: ["Appuntamenti e visite", "Aggiungi, trova, avvia"],
      tracker: ["Timer e calendario", "Tempo, note, tempo a mano"], events: ["Eventi", "Commemorazione, assemblee, congressi…"],
      assignments: ["Incarichi", "Compiti per te o per altri"], contacts: ["Contatti", "Chiama, messaggio, GPS e storico"],
      notes: ["Note rapide", "Un blocco che si salva da solo"], planner: ["Programma", "Cose da fare per giorno o settimana"],
      activity: ["Attività", "Cosa hai fatto, settimana per settimana"], profile: ["Profilo e impostazioni", "Il tuo account e le tue scelte"],
    },
    welcome: [
      ["Benvenuto in MyServiceTime", "Facciamo un giro di un minuto. Puoi saltarlo e rivederlo quando vuoi con il pulsante ❓."],
      ["Il menu", "Passa qui tra Home, Attività e Progressi. Tocca ☰ in alto a sinistra per i tuoi strumenti (timer, appuntamenti, eventi…), promemoria, opzioni, aiuto ed esci."],
      ["La tua giornata a colpo d’occhio", "Appuntamenti di oggi, tempo della settimana, incarichi aperti e cose da fare. Tocca un riquadro per aprirlo."],
      ["Aggiungi veloce", "Aggiungi appuntamento, incarico, evento, cosa da fare, contatto o nota con un tocco."],
      ["I tuoi strumenti", "Tocca ☰ e scegli uno strumento in Strumenti: timer, appuntamenti, eventi, contatti, mappa… Ognuno si apre nella sua pagina."],
      ["Attiva i promemoria", "Tocca Avvia promemoria e consenti le notifiche: i promemoria arrivano come notifiche, con l’app aperta o chiusa."],
      ["L’aiuto è sempre qui", "Tocca ❓ quando vuoi per rivedere questo giro o imparare uno strumento alla volta. Buona giornata!"],
    ],
    appointments: [
      ["Nuovo appuntamento", "Tocca qui per aggiungere un appuntamento o una visita: titolo, data, ora, contatto, indirizzo e allarmi."],
      ["Trovali in fretta", "Cerca e filtra per tipo, data, contatto o persona incaricata."],
      ["La tua lista", "Ognuno mostra il conto alla rovescia. Avvia cronometra una visita, Nota conserva cosa è successo, l’indirizzo apre il GPS."],
    ],
    tracker: [
      ["Timer", "Scrivi cosa fai (e una nota), poi Avvia. Metti in pausa quando vuoi; alla fine puoi aggiungere una nota prima di salvare."],
      ["Calendario del tempo", "Ogni giorno mostra il tempo registrato. Tocca un giorno per vederne sessioni e note."],
      ["Aggiungi tempo a mano", "Hai dimenticato il timer? Aggiungi tu il tempo e cosa hai fatto."],
      ["Vai a qualsiasi mese", "Tocca 📆 per scegliere mese e anno."],
    ],
    events: [
      ["Nuovo evento", "Aggiungi la Commemorazione, un’assemblea, un congresso, la visita del sorvegliante — o scrivi un nome tuo."],
      ["Ripetizioni e promemoria", "Gli eventi possono ripetersi ogni 6 mesi o ogni anno, durare più giorni e avvisarti una settimana e un giorno prima."],
    ],
    assignments: [
      ["Nuovo incarico", "Dai un compito a te o a un contatto, con data, ora e priorità."],
      ["Spuntali", "Tocca il cerchio quando è fatto. Invia lo condivide per SMS o e-mail."],
    ],
    contacts: [
      ["Nuovo contatto", "Salva le persone che visiti: telefono, e-mail, indirizzo, relazione e foto."],
      ["Azioni con un tocco", "Chiama, scrivi, GPS, pianifica una visita, dai un incarico o vedi lo storico."],
    ],
    notes: [
      ["Note rapide", "Scrivi quello che vuoi: si salva da solo. Gli indirizzi diventano link GPS e “Inserisci indirizzo” ne aggiunge uno verificato."],
    ],
    planner: [
      ["Aggiungi una cosa da fare", "Scrivi una cosa da fare per il giorno. Aggiungi un’ora per il promemoria, o spunta “Senza data” per la lista libera."],
      ["Giorno o settimana", "Guarda un giorno o tutta la settimana, con appuntamenti, incarichi, eventi e tempo registrato insieme."],
    ],
    activity: [
      ["Attività settimanale", "I totali della settimana e, giorno per giorno, tutto ciò che hai scritto nel calendario del tempo. ◀ ▶ per altre settimane."],
      ["Tutto quello che hai fatto", "Lo storico completo, dal più recente. Filtra per tempo, appuntamenti, incarichi, eventi o contatti."],
    ],
    profile: [
      ["Il tuo profilo", "Cambia la tua foto e il tuo nome, la tua posizione di proclamatore e il tuo paese."],
      ["Opzioni", "Lingua, primo giorno della settimana, allarmi, promemoria predefiniti e scarica una copia dei tuoi dati."],
    ],
  },

  ru: {
    ui: { step: "Шаг {n} из {total}", back: "Назад", next: "Далее", done: "Готово", skip: "Пропустить",
      helpTitle: "Помощь и обучение", helpIntro: "Выберите короткую экскурсию. Каждая подсвечивает часть приложения и объясняет её." },
    names: {
      welcome: ["Знакомство", "Всё приложение за минуту"], appointments: ["Встречи и визиты", "Добавить, найти, начать"],
      tracker: ["Таймер и календарь", "Время, заметки, время вручную"], events: ["События", "Вечеря, конгрессы…"],
      assignments: ["Поручения", "Задачи для себя или других"], contacts: ["Контакты", "Звонок, SMS, GPS и история"],
      notes: ["Быстрые заметки", "Блокнот, который сохраняется сам"], planner: ["Расписание", "Дела по дням и неделям"],
      activity: ["Активность", "Что вы сделали, неделя за неделей"], profile: ["Профиль и настройки", "Ваш аккаунт и выбор"],
    },
    welcome: [
      ["Добро пожаловать в MyServiceTime", "Давайте познакомимся за минуту. Можно пропустить и посмотреть снова в любой момент кнопкой ❓."],
      ["Меню", "Здесь переключайтесь между Главной, Историей и Прогрессом. Нажмите ☰ слева вверху для инструментов (таймер, встречи, события…), напоминаний, настроек, помощи и выхода."],
      ["Ваш день с одного взгляда", "Встречи сегодня, время за неделю, открытые поручения и дела. Нажмите на блок, чтобы открыть его."],
      ["Быстро добавить", "Встреча, поручение, событие, дело, контакт или заметка — одним нажатием."],
      ["Ваши инструменты", "Нажмите ☰ и выберите инструмент в разделе «Инструменты»: таймер, встречи, события, контакты, карта… Каждый открывается на своей странице."],
      ["Включите напоминания", "Нажмите «Включить напоминания» и разрешите уведомления: напоминания приходят как уведомления, открыто приложение или нет."],
      ["Помощь всегда рядом", "Нажмите ❓ в любой момент, чтобы повторить экскурсию или изучить отдельный инструмент. Хорошего дня!"],
    ],
    appointments: [
      ["Новая встреча", "Нажмите, чтобы добавить встречу или визит: название, дата, время, контакт, адрес и будильники."],
      ["Быстрый поиск", "Ищите и фильтруйте по типу, дате, контакту или исполнителю."],
      ["Ваш список", "У каждой — обратный отсчёт. «Начать» засекает визит, «Заметка» сохраняет итоги, адрес открывает GPS."],
    ],
    tracker: [
      ["Таймер", "Напишите, чем заняты (и заметку), и нажмите «Старт». Ставьте паузу когда угодно; при завершении можно добавить заметку."],
      ["Календарь времени", "Каждый день показывает учтённое время. Нажмите на день, чтобы увидеть сессии и заметки."],
      ["Добавить время вручную", "Забыли включить таймер? Добавьте время и что сделали сами."],
      ["Любой месяц", "Нажмите 📆, чтобы выбрать месяц и год."],
    ],
    events: [
      ["Новое событие", "Добавьте Вечерю, конгресс, районный конгресс, визит районного надзирателя — или своё название."],
      ["Повтор и напоминания", "События могут повторяться раз в 6 месяцев или раз в год, длиться несколько дней и напоминать за неделю и за день."],
    ],
    assignments: [
      ["Новое поручение", "Дайте задачу себе или контакту: дата, время и приоритет."],
      ["Отмечайте", "Нажмите на кружок, когда готово. «Отправить» делится по SMS или почте."],
    ],
    contacts: [
      ["Новый контакт", "Сохраняйте людей, которых посещаете: телефон, почта, адрес, кем приходится и фото."],
      ["Действия в одно нажатие", "Позвонить, написать, GPS, запланировать визит, дать поручение или посмотреть историю."],
    ],
    notes: [
      ["Быстрые заметки", "Пишите что угодно — всё сохраняется само. Адреса становятся ссылками GPS, «Вставить адрес» добавляет проверенный."],
    ],
    planner: [
      ["Добавить дело", "Напишите дело на день. Укажите время для напоминания или отметьте «Без даты» для списка «когда-нибудь»."],
      ["День или неделя", "Смотрите день или всю неделю: встречи, поручения, события и учтённое время вместе."],
    ],
    activity: [
      ["Активность за неделю", "Итоги недели и по дням — всё, что вы записали в календарь времени. ◀ ▶ — другие недели."],
      ["Всё, что вы сделали", "Полная история, сначала новое. Фильтр: время, встречи, поручения, события, контакты."],
    ],
    profile: [
      ["Ваш профиль", "Измените фото и имя, свой статус возвещателя и страну."],
      ["Настройки", "Язык, первый день недели, будильники, напоминания по умолчанию и загрузка копии данных."],
    ],
  },

  ar: {
    ui: { step: "الخطوة {n} من {total}", back: "رجوع", next: "التالي", done: "تم", skip: "تخطَّ",
      helpTitle: "المساعدة والدروس", helpIntro: "اختر جولة قصيرة. كل جولة تُبرز جزءًا من التطبيق وتشرحه." },
    names: {
      welcome: ["جولة الترحيب", "التطبيق كله في دقيقة"], appointments: ["المواعيد والزيارات", "أضف وابحث وابدأ"],
      tracker: ["المؤقت والتقويم", "الوقت والملاحظات والإضافة اليدوية"], events: ["المناسبات", "الذكرى، المحافل، الاجتماعات…"],
      assignments: ["المهام", "مهام لك أو لغيرك"], contacts: ["جهات الاتصال", "اتصال، رسالة، GPS وسجل"],
      notes: ["ملاحظات سريعة", "مفكرة تحفظ نفسها"], planner: ["الجدول", "مهام يومية أو أسبوعية"],
      activity: ["النشاط", "ما فعلته أسبوعًا بأسبوع"], profile: ["الملف والإعدادات", "حسابك واختياراتك"],
    },
    welcome: [
      ["مرحبًا بك في MyServiceTime", "لنأخذ جولة مدتها دقيقة. يمكنك تخطيها ومشاهدتها مجددًا متى شئت من زر ❓."],
      ["القائمة", "تنقّل هنا بين الرئيسية والنشاط والتقدّم. المس ☰ في الأعلى لأدواتك (المؤقت، المواعيد، المناسبات…) والتذكيرات والإعدادات والمساعدة وتسجيل الخروج."],
      ["يومك بنظرة واحدة", "مواعيد اليوم، وقت الأسبوع، المهام المفتوحة والمهام اليومية. المس مربعًا لفتحه."],
      ["إضافة سريعة", "أضف موعدًا أو مهمة أو مناسبة أو مهمة يومية أو جهة اتصال أو ملاحظة بلمسة واحدة."],
      ["أدواتك", "المس ☰ واختر أداة من قسم الأدوات: المؤقت، المواعيد، المناسبات، جهات الاتصال، الخريطة… كل أداة تُفتح في صفحتها الخاصة."],
      ["شغّل التذكيرات", "اضغط «ابدأ التذكيرات» واسمح بالإشعارات: تصلك التذكيرات كإشعارات سواء كان التطبيق مفتوحًا أو مغلقًا."],
      ["المساعدة دائمًا هنا", "المس ❓ في أي وقت لإعادة هذه الجولة أو تعلّم أداة واحدة كل مرة. يومًا سعيدًا!"],
    ],
    appointments: [
      ["موعد جديد", "المس هنا لإضافة موعد أو زيارة: العنوان والتاريخ والوقت وجهة الاتصال والعنوان والمنبهات."],
      ["اعثر عليها بسرعة", "ابحث وصفِّ حسب النوع أو التاريخ أو جهة الاتصال أو الشخص المكلّف."],
      ["قائمتك", "كل موعد يعرض عدًّا تنازليًا. «ابدأ» يحسب وقت الزيارة، و«ملاحظة» تحفظ ما حدث، والعنوان يفتح GPS."],
    ],
    tracker: [
      ["المؤقت", "اكتب ما تفعله (وملاحظة) ثم المس «ابدأ». أوقفه مؤقتًا متى شئت؛ وعند الإنهاء يمكنك إضافة ملاحظة قبل الحفظ."],
      ["تقويم الوقت", "كل يوم يعرض الوقت المسجّل. المس يومًا لترى جلساته وملاحظاته."],
      ["إضافة وقت يدويًا", "نسيت تشغيل المؤقت؟ أضف الوقت وما فعلته بنفسك."],
      ["انتقل إلى أي شهر", "المس 📆 لاختيار الشهر والسنة."],
    ],
    events: [
      ["مناسبة جديدة", "أضف الذكرى أو محفلًا أو اجتماعًا أو زيارة ناظر الدائرة — أو اكتب اسمًا من عندك."],
      ["التكرار والتذكير", "يمكن أن تتكرر المناسبة كل 6 أشهر أو كل سنة، وتستمر عدة أيام، وتذكّرك قبل أسبوع ويوم."],
    ],
    assignments: [
      ["مهمة جديدة", "أعطِ مهمة لنفسك أو لجهة اتصال، مع التاريخ والوقت والأولوية."],
      ["علّمها كمنجزة", "المس الدائرة عند الإنجاز. «إرسال» يشاركها برسالة أو بريد."],
    ],
    contacts: [
      ["جهة اتصال جديدة", "احفظ من تزورهم: الهاتف والبريد والعنوان وصلة القرابة وصورة."],
      ["إجراءات بلمسة", "اتصال، رسالة، GPS، تخطيط زيارة، إعطاء مهمة أو رؤية سجل الزيارات."],
    ],
    notes: [
      ["ملاحظات سريعة", "اكتب ما تشاء — تُحفظ تلقائيًا. تصبح العناوين روابط GPS، و«إدراج عنوان» يضيف عنوانًا موثقًا."],
    ],
    planner: [
      ["أضف مهمة", "اكتب مهمة لليوم. أضف وقتًا إن أردت تذكيرًا، أو اختر «بلا تاريخ» لقائمة أي وقت."],
      ["يوم أو أسبوع", "اعرض يومًا أو الأسبوع كله، مع المواعيد والمهام والمناسبات والوقت المسجّل معًا."],
    ],
    activity: [
      ["النشاط الأسبوعي", "مجاميع الأسبوع، ويومًا بيوم كل ما كتبته في تقويم الوقت. استخدم ◀ ▶ لأسابيع أخرى."],
      ["كل ما فعلته", "السجل الكامل، الأحدث أولًا. صفِّه حسب الوقت أو المواعيد أو المهام أو المناسبات أو جهات الاتصال."],
    ],
    profile: [
      ["ملفك", "غيّر صورتك واسمك، ووضعك كناشر، وبلدك."],
      ["الإعدادات", "اللغة، أول يوم في الأسبوع، المنبهات، التذكيرات الافتراضية، وتنزيل نسخة من بياناتك."],
    ],
  },

  hi: {
    ui: { step: "चरण {n} / {total}", back: "पीछे", next: "आगे", done: "हो गया", skip: "छोड़ें",
      helpTitle: "मदद और ट्यूटोरियल", helpIntro: "एक छोटा टूर चुनें। हर टूर ऐप का एक हिस्सा दिखाकर समझाता है।" },
    names: {
      welcome: ["स्वागत टूर", "पूरा ऐप एक मिनट में"], appointments: ["अपॉइंटमेंट और मुलाक़ातें", "जोड़ें, खोजें, शुरू करें"],
      tracker: ["टाइमर और कैलेंडर", "समय, नोट्स, हाथ से समय"], events: ["कार्यक्रम", "स्मारक, अधिवेशन…"],
      assignments: ["असाइनमेंट", "अपने या दूसरों के काम"], contacts: ["संपर्क", "कॉल, मैसेज, GPS और इतिहास"],
      notes: ["क्विक नोट्स", "अपने-आप सहेजने वाली नोटबुक"], planner: ["समय-सारणी", "दिन या हफ़्ते के काम"],
      activity: ["गतिविधि", "आपने क्या किया, हफ़्ते-दर-हफ़्ते"], profile: ["प्रोफ़ाइल और सेटिंग्स", "आपका खाता और पसंद"],
    },
    welcome: [
      ["MyServiceTime में स्वागत है", "आइए एक मिनट का टूर लें। आप इसे छोड़ सकते हैं और ❓ बटन से कभी भी दोबारा देख सकते हैं।"],
      ["मेन्यू", "यहाँ होम, गतिविधि और प्रगति के बीच जाएँ। अपने टूल (टाइमर, अपॉइंटमेंट, कार्यक्रम…), रिमाइंडर, सेटिंग्स, मदद और लॉग आउट के लिए ऊपर बाईं ओर ☰ टैप करें।"],
      ["आपका दिन एक नज़र में", "आज की अपॉइंटमेंट, इस हफ़्ते का समय, खुले असाइनमेंट और काम। खोलने के लिए किसी बॉक्स पर टैप करें।"],
      ["जल्दी जोड़ें", "एक टैप में अपॉइंटमेंट, असाइनमेंट, कार्यक्रम, काम, संपर्क या नोट जोड़ें।"],
      ["आपके टूल", "☰ टैप करें और टूल में से कोई टूल चुनें: टाइमर, अपॉइंटमेंट, कार्यक्रम, संपर्क, नक्शा… हर टूल अपने पेज पर खुलता है।"],
      ["रिमाइंडर चालू करें", "रिमाइंडर शुरू करें दबाएँ और सूचनाएँ चालू करें: ऐप खुला हो या बंद, रिमाइंडर सूचना के रूप में आएँगे।"],
      ["मदद हमेशा यहाँ है", "यह टूर दोबारा देखने या एक-एक टूल सीखने के लिए कभी भी ❓ टैप करें। आपका दिन शुभ हो!"],
    ],
    appointments: [
      ["नई अपॉइंटमेंट", "अपॉइंटमेंट या मुलाक़ात जोड़ने के लिए यहाँ टैप करें: शीर्षक, तारीख़, समय, संपर्क, पता और अलार्म।"],
      ["जल्दी खोजें", "प्रकार, तारीख़, संपर्क या ज़िम्मेदार व्यक्ति से खोजें और छाँटें।"],
      ["आपकी सूची", "हर एक में उलटी गिनती दिखती है। शुरू करें मुलाक़ात का समय गिनता है, नोट जो हुआ सहेजता है, पता GPS खोलता है।"],
    ],
    tracker: [
      ["टाइमर", "लिखें कि क्या कर रहे हैं (और एक नोट), फिर शुरू करें। कभी भी रोकें; ख़त्म करते समय सहेजने से पहले नोट जोड़ सकते हैं।"],
      ["समय कैलेंडर", "हर दिन दर्ज समय दिखाता है। सत्र और नोट्स देखने के लिए किसी दिन पर टैप करें।"],
      ["हाथ से समय जोड़ें", "टाइमर शुरू करना भूल गए? समय और जो किया, ख़ुद जोड़ें।"],
      ["किसी भी महीने पर जाएँ", "महीना और साल चुनने के लिए 📆 टैप करें।"],
    ],
    events: [
      ["नया कार्यक्रम", "स्मारक, सम्मेलन, अधिवेशन, सर्किट निगरान का दौरा जोड़ें — या अपना नाम लिखें।"],
      ["दोहराव और रिमाइंडर", "कार्यक्रम हर 6 महीने या हर साल दोहरा सकते हैं, कई दिन चल सकते हैं, और एक हफ़्ता व एक दिन पहले याद दिला सकते हैं।"],
    ],
    assignments: [
      ["नया असाइनमेंट", "अपने या किसी संपर्क को तारीख़, समय और प्राथमिकता के साथ काम दें।"],
      ["पूरा होने पर टिक करें", "पूरा होने पर गोले पर टैप करें। भेजें इसे मैसेज या ईमेल से साझा करता है।"],
    ],
    contacts: [
      ["नया संपर्क", "जिनसे मिलते हैं उन्हें सहेजें: फ़ोन, ईमेल, पता, रिश्ता और फ़ोटो।"],
      ["एक टैप में", "कॉल, मैसेज, GPS, नई मुलाक़ात, असाइनमेंट देना या मुलाक़ातों का इतिहास।"],
    ],
    notes: [
      ["क्विक नोट्स", "कुछ भी लिखें — अपने-आप सहेजा जाता है। पते GPS लिंक बन जाते हैं, और “पता डालें” जाँचा हुआ पता जोड़ता है।"],
    ],
    planner: [
      ["काम जोड़ें", "दिन का काम लिखें। रिमाइंडर के लिए समय डालें, या किसी भी समय की सूची के लिए “कोई तारीख़ नहीं” चुनें।"],
      ["दिन या हफ़्ता", "एक दिन या पूरा हफ़्ता देखें — अपॉइंटमेंट, असाइनमेंट, कार्यक्रम और दर्ज समय एक साथ।"],
    ],
    activity: [
      ["साप्ताहिक गतिविधि", "हफ़्ते का कुल और दिन-ब-दिन वह सब जो आपने समय कैलेंडर में लिखा। दूसरे हफ़्तों के लिए ◀ ▶।"],
      ["आपने जो कुछ किया", "पूरा इतिहास, नया पहले। समय, अपॉइंटमेंट, असाइनमेंट, कार्यक्रम या संपर्क से छाँटें।"],
    ],
    profile: [
      ["आपकी प्रोफ़ाइल", "अपनी फ़ोटो और नाम, प्रकाशक की स्थिति और अपना देश बदलें।"],
      ["सेटिंग्स", "भाषा, हफ़्ते का पहला दिन, अलार्म, डिफ़ॉल्ट रिमाइंडर और अपने डेटा की कॉपी डाउनलोड करें।"],
    ],
  },

  zh: {
    ui: { step: "第 {n} 步，共 {total} 步", back: "上一步", next: "下一步", done: "完成", skip: "跳过",
      helpTitle: "帮助与教程", helpIntro: "选择一个简短的引导。每个引导会突出显示应用的一部分并加以说明。" },
    names: {
      welcome: ["欢迎引导", "一分钟了解整个应用"], appointments: ["预约和拜访", "添加、查找、开始"],
      tracker: ["计时器和日历", "计时、备注、手动添加"], events: ["活动", "纪念聚会、大会…"],
      assignments: ["分派任务", "给自己或他人的任务"], contacts: ["联系人", "电话、短信、导航和记录"],
      notes: ["快速笔记", "自动保存的记事本"], planner: ["日程", "按天或按周的待办"],
      activity: ["动态", "每周做了什么"], profile: ["个人资料和设置", "你的账户和偏好"],
    },
    welcome: [
      ["欢迎使用 MyServiceTime", "我们用一分钟带你看看。你可以跳过，之后随时点 ❓ 再看。"],
      ["菜单", "在这里切换首页、动态和进度。点左上角的 ☰ 打开你的工具（计时器、预约、活动…）、提醒、设置、帮助和退出登录。"],
      ["今天一目了然", "今天的预约、本周时间、未完成的任务和待办。点方框即可打开。"],
      ["快速添加", "一点即可添加预约、任务、活动、待办、联系人或笔记。"],
      ["你的工具", "点 ☰，在“工具”下选择：计时器、预约、活动、联系人、地图… 每个工具都在单独的页面打开。"],
      ["开启提醒", "点“开始提醒”并允许通知：无论应用打开还是关闭，提醒都会以通知送达。"],
      ["随时可以求助", "随时点 ❓ 重看引导，或一次学一个工具。祝你今天愉快！"],
    ],
    appointments: [
      ["新预约", "点这里添加预约或拜访：标题、日期、时间、联系人、地址和闹钟提醒。"],
      ["快速查找", "按类型、日期、联系人或负责人搜索和筛选。"],
      ["你的列表", "每项都有倒计时。“开始”为拜访计时，“笔记”记录经过，地址可打开导航。"],
    ],
    tracker: [
      ["计时器", "写下你在做什么（和备注），然后点开始。随时暂停；结束时可在保存前添加备注。"],
      ["时间日历", "每天显示记录的时间。点某天查看当天的时段和备注。"],
      ["手动添加时间", "忘了开计时器？自己补上时间和做了什么。"],
      ["跳到任意月份", "点 📆 选择月份和年份。"],
    ],
    events: [
      ["新活动", "添加纪念聚会、大会、分区大会、分区监督探访，或自己输入名称。"],
      ["重复和提醒", "活动可每 6 个月或每年重复，可持续数天，并提前一周和一天提醒你。"],
    ],
    assignments: [
      ["新任务", "给自己或联系人分派任务，可设日期、时间和优先级。"],
      ["完成打勾", "完成后点圆圈。“发送”可通过短信或邮件分享。"],
    ],
    contacts: [
      ["新联系人", "保存你拜访的人：电话、邮箱、地址、关系和照片。"],
      ["一点即用", "打电话、发短信、导航、安排拜访、分派任务或查看拜访记录。"],
    ],
    notes: [
      ["快速笔记", "随意书写，自动保存。地址会变成导航链接，“插入地址”可添加已核实的地址。"],
    ],
    planner: [
      ["添加待办", "写下当天的待办。加上时间就会提醒，或勾选“无日期”放入随时清单。"],
      ["按天或按周", "查看一天或整周，预约、任务、活动和记录的时间一起显示。"],
    ],
    activity: [
      ["每周动态", "本周总计，以及每天你在时间日历里写下的一切。用 ◀ ▶ 查看其他周。"],
      ["你做过的一切", "完整记录，最新的在前。可按时间、预约、任务、活动或联系人筛选。"],
    ],
    profile: [
      ["你的资料", "更改你的照片和名字、传道员身份以及国家。"],
      ["设置", "语言、每周第一天、闹钟、默认提醒，以及下载数据副本。"],
    ],
  },

  ja: {
    ui: { step: "ステップ {n} / {total}", back: "戻る", next: "次へ", done: "完了", skip: "スキップ",
      helpTitle: "ヘルプとチュートリアル", helpIntro: "短いツアーを選んでください。アプリの各部分を照らして説明します。" },
    names: {
      welcome: ["ようこそツアー", "1分でアプリ全体を紹介"], appointments: ["予定と訪問", "追加・検索・開始"],
      tracker: ["タイマーとカレンダー", "時間・メモ・手動追加"], events: ["イベント", "記念式・大会など"],
      assignments: ["割り当て", "自分や他の人へのタスク"], contacts: ["連絡先", "電話・メッセージ・GPS・履歴"],
      notes: ["クイックメモ", "自動で保存されるメモ帳"], planner: ["スケジュール", "日ごと・週ごとのやること"],
      activity: ["アクティビティ", "週ごとの記録"], profile: ["プロフィールと設定", "アカウントと好み"],
    },
    welcome: [
      ["MyServiceTime へようこそ", "1分で案内します。スキップしても、❓ ボタンからいつでも見直せます。"],
      ["メニュー", "ここでホーム、履歴、進捗を切り替えます。左上の ☰ から、ツール（タイマー・予定・イベントなど）、リマインダー、設定、ヘルプ、ログアウトを開けます。"],
      ["今日がひと目でわかる", "今日の予定、今週の時間、未完了の割り当てとやること。枠をタップすると開きます。"],
      ["すばやく追加", "予定・割り当て・イベント・やること・連絡先・メモをワンタップで追加。"],
      ["あなたのツール", "☰ をタップして「ツール」から選びます：タイマー、予定、イベント、連絡先、地図… それぞれ専用のページで開きます。"],
      ["リマインダーをオンに", "「リマインダー開始」をタップして通知を許可すると、アプリを開いていても閉じていても通知で届きます。"],
      ["ヘルプはいつでもここに", "❓ をタップすれば、このツアーをもう一度見たり、ツールを1つずつ学べます。よい一日を！"],
    ],
    appointments: [
      ["新しい予定", "ここをタップして予定や訪問を追加：タイトル、日付、時刻、連絡先、住所、アラーム。"],
      ["すばやく探す", "種類、日付、連絡先、担当者で検索・絞り込みできます。"],
      ["予定の一覧", "それぞれカウントダウン付き。「開始」で訪問を計測、「メモ」で記録、住所をタップするとGPSが開きます。"],
    ],
    tracker: [
      ["タイマー", "していること（とメモ）を書いて「開始」。いつでも一時停止でき、終了時に保存前にメモを追加できます。"],
      ["時間カレンダー", "各日に記録した時間が表示されます。日をタップするとセッションとメモが見られます。"],
      ["手動で時間を追加", "タイマーを忘れた？ 時間とやったことを自分で追加できます。"],
      ["好きな月へ", "📆 をタップして月と年を選びます。"],
    ],
    events: [
      ["新しいイベント", "記念式、大会、巡回大会、巡回監督の訪問を追加、または自由に名前を入力。"],
      ["くり返しと通知", "6か月ごとや毎年くり返し、数日にわたる設定も可能。1週間前と前日にお知らせします。"],
    ],
    assignments: [
      ["新しい割り当て", "自分や連絡先にタスクを。期日、時刻、優先度も設定できます。"],
      ["完了をチェック", "終わったら丸をタップ。「送信」でメッセージやメールで共有できます。"],
    ],
    contacts: [
      ["新しい連絡先", "訪問する人を保存：電話、メール、住所、関係、写真。"],
      ["ワンタップ操作", "電話、メッセージ、GPS、訪問の計画、割り当て、訪問履歴の確認。"],
    ],
    notes: [
      ["クイックメモ", "何でも書けて自動保存。住所はGPSリンクになり、「住所を挿入」で確認済みの住所を追加できます。"],
    ],
    planner: [
      ["やることを追加", "その日のやることを入力。時刻を入れると通知が届き、「日付なし」でいつでもリストへ。"],
      ["日または週", "1日または1週間を、予定・割り当て・イベント・記録時間と一緒に表示します。"],
    ],
    activity: [
      ["週ごとのアクティビティ", "週の合計と、日ごとに時間カレンダーへ書いた内容すべて。◀ ▶ で他の週へ。"],
      ["これまでの記録", "すべての履歴を新しい順に。時間・予定・割り当て・イベント・連絡先で絞り込めます。"],
    ],
    profile: [
      ["プロフィール", "写真と名前、伝道者としての立場、国を変更できます。"],
      ["設定", "言語、週の始まり、アラーム、既定のリマインダー、データのダウンロード。"],
    ],
  },
};

// ---------- tutorials in the 8 added languages ----------
TOUR_TEXT.tl = {"ui":{"step":"Hakbang {n} sa {total}","back":"Bumalik","next":"Susunod","done":"Tapos","skip":"Laktawan","helpTitle":"Tulong at mga tutorial","helpIntro":"Pumili ng maikling gabay. Bawat isa ay nagpapakita at nagpapaliwanag ng isang bahagi ng app."},"names":{"welcome":["Panimulang gabay","Ang buong app sa isang minuto"],"appointments":["Appointment at pagdalaw","Magdagdag, maghanap at magsimula"],"tracker":["Time tracker at kalendaryo","Itala ang oras, magtala, magdagdag ng oras nang manwal"],"events":["Mga event","Memoryal, asamblea, kombensiyon…"],"assignments":["Mga atas","Magbigay ng gawain sa sarili o sa iba"],"contacts":["Mga kontak","Tawag, text, GPS at kasaysayan ng pagdalaw"],"notes":["Mabilisang tala","Notepad na kusang nagse-save"],"planner":["Iskedyul","Gagawin bawat araw o linggo"],"activity":["Aktibidad","Ang ginawa mo, linggo-linggo"],"profile":["Profile at settings","Ang account mo at mga pinili mo"]},"welcome":[["Maligayang pagdating sa MyServiceTime","Isang minutong gabay ito. Puwede mo itong laktawan at panoorin ulit kahit kailan mula sa button na ❓."],["Ang menu","Dito ka lilipat sa Home, Aktibidad at Progreso. Pindutin ang ☰ sa kaliwang itaas para sa mga tool mo (time tracker, appointment, event…), paalala, settings, tulong at pag-log out."],["Ang araw mo sa isang tingin","Appointment ngayon, oras ngayong linggo, bukas na atas at gagawin. Pindutin ang isang kahon para buksan ito."],["Mabilisang dagdag","Magdagdag ng appointment, atas, event, gagawin, kontak o tala sa isang pindot."],["Mga tool mo","Pindutin ang ☰ at pumili ng tool sa ilalim ng Mga tool — time tracker, appointment, event, kontak, mapa… Bawat isa ay bubukas sa sariling pahina."],["Buksan ang mga paalala","Pindutin ang Simulan ang mga Paalala at payagan ang notification: dumarating ang paalala bilang notification, bukas man o sarado ang app."],["Laging may tulong","Pindutin ang ❓ kahit kailan para ulitin ang gabay na ito o matuto ng isang tool sa bawat pagkakataon. I-enjoy ang araw mo!"]],"appointments":[["Bagong appointment","Pindutin dito para magdagdag ng appointment o pagdalaw: pamagat, petsa, oras, kontak, address at alarm na paalala."],["Mabilis silang hanapin","Maghanap at magsala ayon sa uri, petsa, kontak o sa taong pinag-atasan."],["Ang listahan mo","May countdown ang bawat isa. Sinusukat ng Simulan ang oras ng pagdalaw, itinatago ng Tala ang nangyari, at binubuksan ng address ang GPS."]],"tracker":[["Time tracker","Isulat ang ginagawa mo (at tala), saka pindutin ang Simulan. Puwedeng i-pause kahit kailan; pagkatapos, puwede kang magdagdag ng tala bago i-save."],["Kalendaryo ng oras","Ipinapakita ng bawat araw ang naitala mong oras. Pindutin ang isang araw para makita ang mga sesyon at tala nito."],["Magdagdag ng oras nang manwal","Nakalimutan mong simulan ang timer? Idagdag mo mismo ang oras at ang ginawa mo."],["Pumunta sa kahit anong buwan","Pindutin ang 📆 para pumili ng buwan at taon."]],"events":[["Bagong event","Idagdag ang Memoryal, asamblea, kombensiyon, dalaw ng CO — o i-type ang sarili mong pangalan."],["Mga petsa at paalala","Puwedeng tumagal nang ilang araw ang event, at ipapaalala ito sa iyo isang linggo at isang araw bago."]],"assignments":[["Bagong atas","Magbigay ng gawain sa sarili mo o sa isa sa mga kontak mo, may takdang petsa, oras at prayoridad."],["Markahan kapag tapos","Pindutin ang bilog kapag tapos na. Ibinabahagi ito ng Ipadala sa text o email."]],"contacts":[["Bagong kontak","Itala ang mga dinadalaw mo: telepono, email, address, kaugnayan at litrato."],["Mga aksiyon sa isang pindot","Tumawag, mag-text, kumuha ng GPS na direksiyon, magplano ng pagdalaw, magbigay ng atas o tingnan ang kasaysayan ng pagdalaw."]],"notes":[["Mabilisang tala","Isulat dito ang kahit ano — kusa itong nagse-save. Nagiging link ng GPS ang mga address, at ang “Ilagay ang address” ay nagdadagdag ng nasuring address."]],"planner":[["Magdagdag ng gagawin","Mag-type ng gagawin para sa araw na iyon. Lagyan ng oras kung gusto mo ng paalala, o i-tsek ang “Walang petsa” para sa listahang anumang oras."],["Araw o linggo","Tingnan ang isang araw o ang buong linggo, kasama ang mga appointment, atas, event at naitalang oras."]],"activity":[["Lingguhang aktibidad","Kabuuan ng linggo at, araw-araw, lahat ng isinulat mo sa kalendaryo ng oras. Gamitin ang ◀ ▶ para makita ang ibang linggo."],["Lahat ng ginawa mo","Ang buong kasaysayan, pinakabago muna. Salain ayon sa oras, appointment, atas, event o kontak."]],"profile":[["Ang profile mo","Palitan ang litrato at pangalan mo, ang katayuan mo bilang mamamahayag at ang bansa mo."],["Settings","Wika, unang araw ng linggo, alarm, karaniwang paalala, at pag-download ng kopya ng data mo."]]};
TOUR_TEXT.ko = {"ui":{"step":"{total}단계 중 {n}단계","back":"뒤로","next":"다음","done":"완료","skip":"건너뛰기","helpTitle":"도움말과 사용법 안내","helpIntro":"짧은 안내를 고르세요. 각 안내가 앱의 한 부분을 보여 주고 설명합니다."},"names":{"welcome":["시작 안내","1분 만에 보는 앱 전체"],"appointments":["약속과 방문","추가하고, 찾고, 시작하기"],"tracker":["시간 기록과 달력","시간 기록, 메모, 직접 시간 추가"],"events":["행사","기념식, 대회…"],"assignments":["임무","나 또는 다른 사람에게 일 맡기기"],"contacts":["연락처","전화, 문자, GPS, 방문 기록"],"notes":["빠른 메모","스스로 저장되는 메모장"],"planner":["일정","일별 또는 주별 할 일"],"activity":["활동","주마다 한 일"],"profile":["프로필과 설정","내 계정과 선택 사항"]},"welcome":[["MyServiceTime에 오신 것을 환영합니다","1분짜리 안내입니다. 건너뛸 수 있고, ❓ 버튼으로 언제든 다시 볼 수 있습니다."],["메뉴","여기서 홈, 활동, 진행 사이를 오갑니다. 왼쪽 위 ☰을 누르면 도구(시간 기록, 약속, 행사…), 알림, 설정, 도움말, 로그아웃이 나옵니다."],["오늘 하루 한눈에","오늘 약속, 이번 주 시간, 진행 중인 임무와 할 일. 상자를 눌러 열어 보세요."],["빠른 추가","약속, 임무, 행사, 할 일, 연락처, 메모를 한 번에 추가하세요."],["내 도구","☰을 누르고 도구에서 고르세요 — 시간 기록, 약속, 행사, 연락처, 지도… 각각 자기 페이지에서 열립니다."],["알림 켜기","알림 시작을 누르고 알림을 허용하세요. 앱이 열려 있든 닫혀 있든 리마인더가 알림으로 옵니다."],["도움은 언제나 여기에","언제든 ❓을 눌러 이 안내를 다시 보거나 도구를 하나씩 배우세요. 좋은 하루 보내세요!"]],"appointments":[["새 약속","여기를 눌러 약속이나 방문을 추가하세요: 제목, 날짜, 시간, 연락처, 주소, 알람 알림."],["빨리 찾기","종류, 날짜, 연락처, 담당자로 검색하고 거르세요."],["내 목록","각각 남은 시간이 표시됩니다. 시작으로 방문 시간을 재고, 메모로 있었던 일을 남기고, 주소를 누르면 GPS가 열립니다."]],"tracker":[["시간 기록","하는 일(과 메모)을 적고 시작을 누르세요. 언제든 일시정지할 수 있고, 마칠 때 메모를 붙여 저장할 수 있습니다."],["시간 달력","날마다 기록한 시간이 표시됩니다. 날짜를 누르면 그날의 기록과 메모가 보입니다."],["직접 시간 추가","타이머 시작을 잊었나요? 시간과 한 일을 직접 추가하세요."],["원하는 달로 이동","📆을 눌러 월과 연도를 고르세요."]],"events":[["새 행사","기념식, 순회 대회, 지역 대회, 순회 감독자 방문을 추가하거나 직접 이름을 입력하세요."],["날짜와 알림","행사는 여러 날 이어질 수 있고, 1주 전과 하루 전에 알려 드립니다."]],"assignments":[["새 임무","나나 연락처의 다른 사람에게 마감일, 시간, 우선순위와 함께 일을 맡기세요."],["완료 표시","끝나면 동그라미를 누르세요. 보내기로 문자나 이메일로 공유합니다."]],"contacts":[["새 연락처","방문하는 사람을 저장하세요: 전화, 이메일, 주소, 관계, 사진."],["한 번에 하는 일","전화, 문자, GPS 길찾기, 새 방문 계획, 임무 맡기기, 방문 기록 보기."]],"notes":[["빠른 메모","무엇이든 쓰세요 — 스스로 저장됩니다. 주소는 GPS 링크가 되고, “주소 넣기”는 확인된 주소를 넣습니다."]],"planner":[["할 일 추가","그날 할 일을 입력하세요. 알림을 원하면 시간을 넣고, 날짜 없는 목록이면 “날짜 없음”을 체크하세요."],["일 또는 주","하루 또는 한 주 전체를 약속, 임무, 행사, 기록 시간과 함께 보세요."]],"activity":[["주간 활동","한 주의 합계와, 날마다 시간 달력에 적은 모든 것. ◀ ▶로 다른 주를 보세요."],["한 모든 일","최신순 전체 기록. 시간, 약속, 임무, 행사, 연락처로 거르세요."]],"profile":[["내 프로필","사진과 이름, 전도인 신분, 국가를 바꿀 수 있습니다."],["설정","언어, 한 주의 시작, 알람, 기본 알림, 데이터 사본 다운로드."]]};
TOUR_TEXT.sw = {"ui":{"step":"Hatua {n} kati ya {total}","back":"Rudi","next":"Endelea","done":"Imekamilika","skip":"Ruka","helpTitle":"Msaada na mafunzo","helpIntro":"Chagua maelekezo mafupi. Kila moja linaonyesha na kueleza sehemu moja ya programu."},"names":{"welcome":["Maelekezo ya kukaribisha","Programu nzima kwa dakika moja"],"appointments":["Miadi na ziara","Ongeza, tafuta na uanze"],"tracker":["Kipima muda na kalenda","Pima muda, andika maelezo, ongeza muda kwa mkono"],"events":["Matukio","Ukumbusho, makusanyiko…"],"assignments":["Kazi","Jipe kazi au mpe mwingine"],"contacts":["Watu","Simu, ujumbe, GPS na historia ya ziara"],"notes":["Maelezo ya haraka","Daftari linalojihifadhi lenyewe"],"planner":["Ratiba","Mambo ya kufanya kwa siku au wiki"],"activity":["Shughuli","Ulichofanya, wiki kwa wiki"],"profile":["Wasifu na mipangilio","Akaunti yako na machaguo yako"]},"welcome":[["Karibu MyServiceTime","Haya ni maelekezo ya dakika moja. Unaweza kuyaruka na kuyatazama tena wakati wowote kutoka kitufe ❓."],["Menyu","Hapa unahama kati ya Nyumbani, Shughuli na Maendeleo. Gusa ☰ juu kushoto kwa zana zako (kipima muda, miadi, matukio…), vikumbusho, mipangilio, msaada na kutoka."],["Siku yako kwa mtazamo mmoja","Miadi ya leo, muda wa wiki hii, kazi zilizo wazi na mambo ya kufanya. Gusa kisanduku kukifungua."],["Ongeza haraka","Ongeza miadi, kazi, tukio, jambo la kufanya, mtu au maelezo kwa mguso mmoja."],["Zana zako","Gusa ☰ na uchague zana chini ya Zana — kipima muda, miadi, matukio, watu, ramani… Kila moja hufunguka kwenye ukurasa wake."],["Washa vikumbusho","Gusa Anza Vikumbusho na uruhusu arifa: vikumbusho vinakuja kama arifa, programu ikiwa wazi au imefungwa."],["Msaada uko hapa daima","Gusa ❓ wakati wowote kurudia maelekezo haya au kujifunza zana moja moja. Furahia siku yako!"]],"appointments":[["Miadi mpya","Gusa hapa kuongeza miadi au ziara: kichwa, tarehe, saa, mtu, anwani na vikumbusho vya kengele."],["Zipate haraka","Tafuta na uchuje kwa aina, tarehe, mtu au aliyepewa."],["Orodha yako","Kila moja inaonyesha muda uliobaki. Anza hupima muda wa ziara, Maelezo huhifadhi kilichotokea, na anwani hufungua GPS."]],"tracker":[["Kipima muda","Andika unachofanya (na maelezo), kisha bonyeza Anza. Sitisha wakati wowote; ukimaliza, unaweza kuongeza maelezo kabla ya kuhifadhi."],["Kalenda ya muda","Kila siku inaonyesha muda ulioandika. Gusa siku kuona vipindi na maelezo yake."],["Ongeza muda kwa mkono","Umesahau kuanzisha kipima muda? Ongeza muda na ulichofanya wewe mwenyewe."],["Nenda mwezi wowote","Gusa 📆 kuchagua mwezi na mwaka."]],"events":[["Tukio jipya","Ongeza Ukumbusho, kusanyiko, kusanyiko la eneo, ziara ya mwangalizi wa mzunguko — au andika jina lako."],["Tarehe na vikumbusho","Matukio yanaweza kudumu siku kadhaa, na kukukumbusha wiki moja na siku moja kabla."]],"assignments":[["Kazi mpya","Jipe kazi au mpe mtu katika watu wako, na tarehe ya mwisho, saa na kipaumbele."],["Ziwekee alama","Gusa duara ikikamilika. Tuma huishiriki kwa ujumbe au barua pepe."]],"contacts":[["Mtu mpya","Hifadhi watu unaowatembelea: simu, barua pepe, anwani, uhusiano na picha."],["Vitendo vya mguso mmoja","Piga simu, tuma ujumbe, pata maelekezo ya GPS, panga ziara mpya, toa kazi au ona historia ya ziara."]],"notes":[["Maelezo ya haraka","Andika chochote hapa — kinajihifadhi chenyewe. Anwani huwa viungo vya GPS, na “Weka anwani” huongeza iliyokaguliwa."]],"planner":[["Ongeza jambo la kufanya","Andika jambo la siku hiyo. Ongeza saa ukitaka kikumbusho, au weka alama “Bila tarehe” kwa orodha ya wakati wowote."],["Siku au wiki","Ona siku moja au wiki nzima, pamoja na miadi, kazi, matukio na muda ulioandika."]],"activity":[["Shughuli za wiki","Jumla za wiki na, siku kwa siku, kila ulichoandika kwenye kalenda ya muda. Tumia ◀ ▶ kuona wiki nyingine."],["Kila ulichofanya","Historia kamili, za karibuni kwanza. Chuja kwa muda, miadi, kazi, matukio au watu."]],"profile":[["Wasifu wako","Badilisha picha na jina lako, hali yako ya mhubiri na nchi yako."],["Mipangilio","Lugha, siku ya kwanza ya wiki, kengele, vikumbusho vya kawaida, na kupakua nakala ya data yako."]]};
TOUR_TEXT.tw = {"ui":{"step":"Anammɔn {n} wɔ {total} mu","back":"San","next":"Nea edi hɔ","done":"Wɔawie","skip":"Twa mu","helpTitle":"Mmoa ne nkyerɛkyerɛ","helpIntro":"Yi nkyerɛkyerɛ tiaa bi. Biara kyerɛ app no fa bi na ɛkyerɛkyerɛ mu."},"names":{"welcome":["Akwaaba nkyerɛkyerɛ","App no nyinaa wɔ sima baako mu"],"appointments":["Nhyiamu ne nsrahwɛ","Fa ka ho, hwehwɛ na fi ase"],"tracker":["Bere susukwan ne kalenda","Susuw bere, kyerɛw nsɛm, fa nsa ka bere ho"],"events":["Dwumadi","Nkaedi, nhyiamu…"],"assignments":["Adwuma","Fa adwuma ma wo ho anaa afoforo"],"contacts":["Nnipa","Frɛ, text, GPS ne nsrahwɛ abakɔsɛm"],"notes":["Nsɛm ntɛm","Nwoma a ɛkora ne ho"],"planner":["Bere nhyehyɛe","Nea ɛsɛ sɛ woyɛ da anaa nnawɔtwe biara"],"activity":["Dwumadi","Nea woyɛe, nnawɔtwe biara"],"profile":["Profile ne settings","Wo account ne nea wopɛ"]},"welcome":[["Akwaaba wɔ MyServiceTime","Eyi yɛ sima baako nkyerɛkyerɛ. Wubetumi atwa mu na woahwɛ bio bere biara afi ❓ no so."],["Menu no","Ha na wofi Fie, Dwumadi ne Nkɔso ntam. Mia ☰ wɔ benkum soro hɔ na hu wo nnwinnade (bere susukwan, nhyiamu, dwumadi…), nkaekae, settings, mmoa ne fi mu."],["Wo da no nyinaa wɔ nhwɛso baako mu","Nhyiamu ɛnnɛ, bere nnawɔtwe yi, adwuma ne nea ɛsɛ sɛ woyɛ. Mia adaka bi so na bue."],["Fa ka ho ntɛm","Fa nhyiamu, adwuma, dwumadi, nea ɛsɛ sɛ woyɛ, onipa anaa nsɛm ka ho wɔ mia baako so."],["Wo nnwinnade","Mia ☰ na yi adwinnade bi wɔ Nnwinnade ase — bere susukwan, nhyiamu, dwumadi, nnipa, map… Biara bue wɔ ne kratafa so."],["Fi nkaekae ase","Mia Fi Nkaekae Ase na ma amanneɛbɔ kwan: wo nkaekae ba sɛ amanneɛbɔ, sɛ app no bue anaa ato mu."],["Mmoa wɔ ha daa","Mia ❓ bere biara na hwɛ nkyerɛkyerɛ yi bio anaa sua adwinnade baako baako. Ma w'ani nnye wo da no ho!"]],"appointments":[["Nhyiamu foforo","Mia ha na fa nhyiamu anaa nsrahwɛ ka ho: din, da, dɔnhwerew, onipa, address ne dɔn nkaekae."],["Hu wɔn ntɛm","Hwehwɛ na yi wɔ ɛsu, da, onipa anaa obi a wɔde ama no so."],["Wo list","Biara kyerɛ bere a aka. Fi ase susuw nsrahwɛ bere, Nsɛm kora nea esii, na address no bue GPS."]],"tracker":[["Bere susukwan","Kyerɛw nea woreyɛ (ne nsɛm), na mia Fi ase. Gyina kakra bere biara; sɛ wowie a, wubetumi de nsɛm aka ho ansa na woakora."],["Bere kalenda","Da biara kyerɛ bere a wokyerɛwee. Mia da bi so na hu ne nsɛm."],["Fa nsa ka bere ho","Wo werɛ fii sɛ wobɛfi ase? Fa bere no ne nea woyɛe ka ho w'ankasa."],["Kɔ bosome biara","Mia 📆 na yi bosome ne afe."]],"events":[["Dwumadi foforo","Fa Nkaedi, nhyiamu kɛse, ɔmantam nhyiamu, ɔmantam sohwɛfo nsrahwɛ ka ho — anaa kyerɛw wo ankasa din."],["Nna ne nkaekae","Dwumadi betumi akɔ so nnafua pii, na ɛbɛkae wo nnawɔtwe baako ne da baako ansa."]],"assignments":[["Adwuma foforo","Fa adwuma ma wo ho anaa obi wɔ wo nnipa mu, ne da a ɛsɛ sɛ ewie, dɔnhwerew ne nea edi kan."],["Hyɛ nsɛnkyerɛnne","Mia kurukuruwa no so sɛ wɔawie a. Soma de kɔ text anaa email so."]],"contacts":[["Onipa foforo","Kora nnipa a wosra wɔn: telefon, email, address, abusuabɔ ne mfonini."],["Mia baako dwumadi","Frɛ, text, nya GPS kwankyerɛ, hyehyɛ nsrahwɛ foforo, fa adwuma ma anaa hwɛ nsrahwɛ abakɔsɛm."]],"notes":[["Nsɛm ntɛm","Kyerɛw biribiara wɔ ha — ɛkora ne ho. Address yɛ GPS link, na “Fa address hyɛ mu” de nea wɔahwɛ ka ho."]],"planner":[["Fa nea ɛsɛ sɛ woyɛ ka ho","Kyerɛw nea ɛsɛ sɛ woyɛ da no. Fa dɔnhwerew ka ho sɛ wopɛ nkaekae, anaa hyɛ “Da biara nni so” nsɛnkyerɛnne ma bere biara list."],["Da anaa nnawɔtwe","Hwɛ da baako anaa nnawɔtwe no nyinaa, ne nhyiamu, adwuma, dwumadi ne bere a wokyerɛwee."]],"activity":[["Nnawɔtwe dwumadi","Nnawɔtwe no nyinaa ne, da biara, biribiara a wokyerɛw wɔ bere kalenda mu. Fa ◀ ▶ hwɛ nnawɔtwe foforo."],["Biribiara a woyɛe","Abakɔsɛm no nyinaa, nea ɛyɛ foforo di kan. Yi wɔ bere, nhyiamu, adwuma, dwumadi anaa nnipa so."]],"profile":[["Wo profile","Sesa wo mfonini ne wo din, wo dawurubɔfo gyinabea ne wo man."],["Settings","Kasa, nnawɔtwe da a edi kan, dɔn, nkaekae a ɛwɔ hɔ dedaw, ne sɛ wobɛtwe wo data ho mfonini."]]};
TOUR_TEXT.pl = {"ui":{"step":"Krok {n} z {total}","back":"Wstecz","next":"Dalej","done":"Gotowe","skip":"Pomiń","helpTitle":"Pomoc i samouczki","helpIntro":"Wybierz krótki przewodnik. Każdy podświetla część aplikacji i ją objaśnia."},"names":{"welcome":["Przewodnik powitalny","Cała aplikacja w minutę"],"appointments":["Spotkania i odwiedziny","Dodawaj, szukaj, zaczynaj"],"tracker":["Licznik czasu i kalendarz","Mierz czas, notuj, dodawaj czas ręcznie"],"events":["Wydarzenia","Pamiątka, zgromadzenia, kongresy…"],"assignments":["Zadania","Przydzielaj zadania sobie lub innym"],"contacts":["Kontakty","Telefon, SMS, GPS i historia odwiedzin"],"notes":["Szybkie notatki","Notatnik, który sam się zapisuje"],"planner":["Harmonogram","Rzeczy do zrobienia na dzień lub tydzień"],"activity":["Aktywność","Co robiłeś, tydzień po tygodniu"],"profile":["Profil i ustawienia","Twoje konto i wybory"]},"welcome":[["Witamy w MyServiceTime","To minutowy przewodnik. Możesz go pominąć i obejrzeć ponownie w każdej chwili przyciskiem ❓."],["Menu","Tutaj przełączasz Start, Aktywność i Postępy. Dotknij ☰ w lewym górnym rogu, aby otworzyć narzędzia (licznik czasu, spotkania, wydarzenia…), przypomnienia, ustawienia, pomoc i wylogowanie."],["Twój dzień w skrócie","Dzisiejsze spotkania, czas w tym tygodniu, otwarte zadania i rzeczy do zrobienia. Dotknij pola, aby je otworzyć."],["Szybkie dodawanie","Dodaj spotkanie, zadanie, wydarzenie, rzecz do zrobienia, kontakt lub notatkę jednym dotknięciem."],["Twoje narzędzia","Dotknij ☰ i wybierz narzędzie w sekcji Narzędzia — licznik czasu, spotkania, wydarzenia, kontakty, mapa… Każde otwiera się na własnej stronie."],["Włącz przypomnienia","Dotknij Włącz przypomnienia i zezwól na powiadomienia: przypomnienia przychodzą jako powiadomienia, czy aplikacja jest otwarta, czy zamknięta."],["Pomoc jest zawsze tutaj","Dotknij ❓ w dowolnej chwili, aby powtórzyć ten przewodnik lub poznawać narzędzia po kolei. Miłego dnia!"]],"appointments":[["Nowe spotkanie","Dotknij tutaj, aby dodać spotkanie lub odwiedziny: tytuł, datę, godzinę, kontakt, adres i przypomnienia z alarmem."],["Szybkie wyszukiwanie","Szukaj i filtruj według rodzaju, daty, kontaktu lub osoby, której przydzielono."],["Twoja lista","Każde pokazuje odliczanie. Start mierzy czas odwiedzin, Notatka zapisuje, co się wydarzyło, a adres otwiera GPS."]],"tracker":[["Licznik czasu","Wpisz, co robisz (i notatkę), potem naciśnij Start. Wstrzymuj w każdej chwili; na koniec możesz dodać notatkę przed zapisaniem."],["Kalendarz czasu","Każdy dzień pokazuje zapisany czas. Dotknij dnia, aby zobaczyć sesje i notatki."],["Dodaj czas ręcznie","Zapomniałeś włączyć licznik? Dodaj sam czas i to, co robiłeś."],["Przejdź do dowolnego miesiąca","Dotknij 📆, aby wybrać miesiąc i rok."]],"events":[["Nowe wydarzenie","Dodaj Pamiątkę, zgromadzenie, kongres, wizytę nadzorcy obwodu — albo wpisz własną nazwę."],["Daty i przypomnienia","Wydarzenia mogą trwać kilka dni i przypominać tydzień oraz dzień wcześniej."]],"assignments":[["Nowe zadanie","Przydziel zadanie sobie lub komuś z kontaktów, z terminem, godziną i priorytetem."],["Odhacz je","Dotknij kółka, gdy jest zrobione. Wyślij udostępnia je SMS-em lub e-mailem."]],"contacts":[["Nowy kontakt","Zapisuj osoby, które odwiedzasz: telefon, e-mail, adres, relację i zdjęcie."],["Akcje jednym dotknięciem","Zadzwoń, napisz SMS, wyznacz trasę GPS, zaplanuj odwiedziny, przydziel zadanie lub zobacz historię odwiedzin."]],"notes":[["Szybkie notatki","Pisz tu cokolwiek — zapisuje się samo. Adresy stają się linkami GPS, a „Wstaw adres” dodaje sprawdzony adres."]],"planner":[["Dodaj rzecz do zrobienia","Wpisz rzecz do zrobienia na ten dzień. Dodaj godzinę, jeśli chcesz przypomnienia, lub zaznacz „Bez daty” dla listy Kiedykolwiek."],["Dzień lub tydzień","Zobacz jeden dzień albo cały tydzień, razem ze spotkaniami, zadaniami, wydarzeniami i zapisanym czasem."]],"activity":[["Aktywność tygodniowa","Podsumowanie tygodnia i, dzień po dniu, wszystko, co wpisałeś w kalendarzu czasu. Użyj ◀ ▶, aby zobaczyć inne tygodnie."],["Wszystko, co robiłeś","Pełna historia, od najnowszych. Filtruj według czasu, spotkań, zadań, wydarzeń lub kontaktów."]],"profile":[["Twój profil","Zmień zdjęcie i imię, swój status głosiciela oraz kraj."],["Ustawienia","Język, pierwszy dzień tygodnia, alarmy, domyślne przypomnienia i pobranie kopii danych."]]};
TOUR_TEXT.nl = {"ui":{"step":"Stap {n} van {total}","back":"Terug","next":"Volgende","done":"Klaar","skip":"Overslaan","helpTitle":"Hulp en uitleg","helpIntro":"Kies een korte rondleiding. Elke rondleiding licht een deel van de app uit en legt het uit."},"names":{"welcome":["Welkomstrondleiding","De hele app in één minuut"],"appointments":["Afspraken en bezoeken","Toevoegen, vinden en starten"],"tracker":["Tijdregistratie en kalender","Tijd bijhouden, notities, tijd met de hand toevoegen"],"events":["Evenementen","Gedachtenisviering, vergaderingen, congressen…"],"assignments":["Taken","Taken geven aan jezelf of anderen"],"contacts":["Contacten","Bellen, sms, gps en bezoekgeschiedenis"],"notes":["Snelle notities","Een kladblok dat zichzelf opslaat"],"planner":["Schema","To-do's per dag of per week"],"activity":["Activiteit","Wat je deed, week na week"],"profile":["Profiel en instellingen","Je account en je keuzes"]},"welcome":[["Welkom bij MyServiceTime","Een rondleiding van één minuut. Je kunt hem overslaan en altijd opnieuw bekijken via de knop ❓."],["Het menu","Wissel hier tussen Home, Activiteit en Voortgang. Tik op ☰ linksboven voor je tools (tijdregistratie, afspraken, evenementen…), herinneringen, instellingen, hulp en uitloggen."],["Je dag in één oogopslag","Afspraken vandaag, tijd deze week, open taken en to-do's. Tik op een vak om het te openen."],["Snel toevoegen","Voeg met één tik een afspraak, taak, evenement, to-do, contact of notitie toe."],["Je tools","Tik op ☰ en kies een tool onder Tools — tijdregistratie, afspraken, evenementen, contacten, kaart… Elke tool opent op een eigen pagina."],["Herinneringen aanzetten","Tik op Herinneringen starten en sta meldingen toe: herinneringen komen als melding, of de app nu open of dicht is."],["Hulp is er altijd","Tik op ❓ om deze rondleiding opnieuw te bekijken of de tools één voor één te leren. Geniet van je dag!"]],"appointments":[["Nieuwe afspraak","Tik hier om een afspraak of bezoek toe te voegen: titel, datum, tijd, contact, adres en alarmherinneringen."],["Snel terugvinden","Zoek en filter op soort, datum, contact of de persoon aan wie het is toegewezen."],["Je lijst","Elk item toont een aftelling. Start meet de tijd van een bezoek, Notitie bewaart wat er gebeurde en het adres opent de gps."]],"tracker":[["Tijdregistratie","Schrijf op wat je doet (en een notitie) en druk op Start. Pauzeer wanneer je wilt; als je klaar bent, kun je een notitie toevoegen voordat je opslaat."],["Tijdkalender","Elke dag toont de geregistreerde tijd. Tik op een dag voor de sessies en notities."],["Tijd met de hand toevoegen","Vergeten de timer te starten? Voeg de tijd en wat je deed zelf toe."],["Naar elke maand","Tik op 📆 om een maand en jaar te kiezen."]],"events":[["Nieuw evenement","Voeg de Gedachtenisviering, een kringvergadering, een congres, een bezoek van de kringopziener toe — of typ een eigen naam."],["Data en herinneringen","Evenementen kunnen meerdere dagen duren en je een week en een dag van tevoren herinneren."]],"assignments":[["Nieuwe taak","Geef een taak aan jezelf of iemand uit je contacten, met een deadline, tijd en prioriteit."],["Afvinken","Tik op het rondje als het klaar is. Versturen deelt het via sms of e-mail."]],"contacts":[["Nieuw contact","Bewaar de mensen die je bezoekt: telefoon, e-mail, adres, relatie en een foto."],["Acties met één tik","Bellen, sms'en, gps-route, een nieuw bezoek plannen, een taak geven of de bezoekgeschiedenis bekijken."]],"notes":[["Snelle notities","Schrijf hier wat je wilt — het slaat zichzelf op. Adressen worden gps-links, en “Adres invoegen” voegt een gecontroleerd adres toe."]],"planner":[["Een to-do toevoegen","Typ een to-do voor de dag. Voeg een tijd toe als je een herinnering wilt, of vink “Geen datum” aan voor de lijst wanneer dan ook."],["Dag of week","Bekijk één dag of de hele week, samen met je afspraken, taken, evenementen en geregistreerde tijd."]],"activity":[["Weekactiviteit","Totalen van de week en, dag na dag, alles wat je in de tijdkalender schreef. Gebruik ◀ ▶ voor andere weken."],["Alles wat je deed","De volledige geschiedenis, nieuwste eerst. Filter op tijd, afspraken, taken, evenementen of contacten."]],"profile":[["Je profiel","Wijzig je foto en naam, je status als verkondiger en je land."],["Instellingen","Taal, eerste dag van de week, alarmen, standaardherinneringen en een kopie van je gegevens downloaden."]]};
TOUR_TEXT.id = {"ui":{"step":"Langkah {n} dari {total}","back":"Kembali","next":"Berikutnya","done":"Selesai","skip":"Lewati","helpTitle":"Bantuan dan panduan","helpIntro":"Pilih tur singkat. Masing-masing menyorot satu bagian aplikasi dan menjelaskannya."},"names":{"welcome":["Tur sambutan","Seluruh aplikasi dalam satu menit"],"appointments":["Janji dan kunjungan","Tambah, cari, dan mulai"],"tracker":["Pencatat waktu dan kalender","Catat waktu, tulis catatan, tambah waktu manual"],"events":["Acara","Peringatan, kebaktian…"],"assignments":["Tugas","Beri tugas untuk diri sendiri atau orang lain"],"contacts":["Kontak","Telepon, SMS, GPS, dan riwayat kunjungan"],"notes":["Catatan cepat","Buku catatan yang menyimpan sendiri"],"planner":["Jadwal","Kegiatan per hari atau per minggu"],"activity":["Aktivitas","Yang Anda lakukan, minggu demi minggu"],"profile":["Profil dan pengaturan","Akun dan pilihan Anda"]},"welcome":[["Selamat datang di MyServiceTime","Ini tur satu menit. Anda bisa melewatinya dan menontonnya lagi kapan saja lewat tombol ❓."],["Menu","Berpindah antara Beranda, Aktivitas, dan Kemajuan di sini. Ketuk ☰ di kiri atas untuk alat Anda (pencatat waktu, janji, acara…), pengingat, pengaturan, bantuan, dan keluar."],["Hari Anda sekilas","Janji hari ini, waktu minggu ini, tugas terbuka, dan kegiatan. Ketuk kotak untuk membukanya."],["Tambah cepat","Tambahkan janji, tugas, acara, kegiatan, kontak, atau catatan dengan satu ketukan."],["Alat Anda","Ketuk ☰ lalu pilih alat di bawah Alat — pencatat waktu, janji, acara, kontak, peta… Masing-masing terbuka di halamannya sendiri."],["Nyalakan pengingat","Ketuk Mulai Pengingat dan izinkan notifikasi: pengingat datang sebagai notifikasi, baik aplikasi terbuka maupun tertutup."],["Bantuan selalu ada","Ketuk ❓ kapan saja untuk mengulang tur ini atau mempelajari satu alat sekaligus. Nikmati hari Anda!"]],"appointments":[["Janji baru","Ketuk di sini untuk menambah janji atau kunjungan: judul, tanggal, jam, kontak, alamat, dan pengingat alarm."],["Temukan dengan cepat","Cari dan saring menurut jenis, tanggal, kontak, atau orang yang ditugaskan."],["Daftar Anda","Masing-masing menunjukkan hitung mundur. Mulai mencatat waktu kunjungan, Catatan menyimpan yang terjadi, dan alamat membuka GPS."]],"tracker":[["Pencatat waktu","Tulis apa yang Anda kerjakan (dan catatan), lalu tekan Mulai. Jeda kapan saja; saat selesai, Anda bisa menambah catatan sebelum menyimpan."],["Kalender waktu","Setiap hari menunjukkan waktu yang Anda catat. Ketuk hari untuk melihat sesi dan catatannya."],["Tambah waktu manual","Lupa menyalakan pencatat? Tambahkan sendiri waktu dan apa yang Anda kerjakan."],["Lompat ke bulan mana pun","Ketuk 📆 untuk memilih bulan dan tahun."]],"events":[["Acara baru","Tambahkan Peringatan, kebaktian wilayah, kebaktian regional, kunjungan pengawas wilayah — atau ketik nama sendiri."],["Tanggal dan pengingat","Acara bisa berlangsung beberapa hari, dan mengingatkan Anda seminggu dan sehari sebelumnya."]],"assignments":[["Tugas baru","Beri tugas untuk diri sendiri atau seseorang di kontak, dengan batas waktu, jam, dan prioritas."],["Centang setelah selesai","Ketuk lingkaran saat selesai. Kirim membagikannya lewat SMS atau email."]],"contacts":[["Kontak baru","Simpan orang yang Anda kunjungi: telepon, email, alamat, hubungan, dan foto."],["Aksi satu ketukan","Telepon, SMS, rute GPS, rencanakan kunjungan baru, beri tugas, atau lihat riwayat kunjungan."]],"notes":[["Catatan cepat","Tulis apa saja di sini — tersimpan sendiri. Alamat menjadi tautan GPS, dan “Sisipkan alamat” menambahkan alamat yang sudah diperiksa."]],"planner":[["Tambah kegiatan","Ketik kegiatan untuk hari itu. Tambahkan jam jika ingin pengingat, atau centang “Tanpa tanggal” untuk daftar kapan saja."],["Hari atau minggu","Lihat satu hari atau seminggu penuh, bersama janji, tugas, acara, dan waktu yang dicatat."]],"activity":[["Aktivitas mingguan","Total minggu itu dan, hari demi hari, semua yang Anda tulis di kalender waktu. Pakai ◀ ▶ untuk melihat minggu lain."],["Semua yang Anda lakukan","Riwayat lengkap, yang terbaru dulu. Saring menurut waktu, janji, tugas, acara, atau kontak."]],"profile":[["Profil Anda","Ubah foto dan nama Anda, status penyiar Anda, dan negara Anda."],["Pengaturan","Bahasa, hari pertama dalam minggu, alarm, pengingat bawaan, dan unduh salinan data Anda."]]};
TOUR_TEXT.vi = {"ui":{"step":"Bước {n} / {total}","back":"Quay lại","next":"Tiếp","done":"Xong","skip":"Bỏ qua","helpTitle":"Trợ giúp và hướng dẫn","helpIntro":"Chọn một hướng dẫn ngắn. Mỗi hướng dẫn làm nổi bật một phần của ứng dụng và giải thích nó."},"names":{"welcome":["Hướng dẫn chào mừng","Toàn bộ ứng dụng trong một phút"],"appointments":["Cuộc hẹn và thăm viếng","Thêm, tìm và bắt đầu"],"tracker":["Đếm giờ và lịch","Đếm giờ, ghi chú, thêm giờ bằng tay"],"events":["Sự kiện","Lễ Tưởng Niệm, hội nghị…"],"assignments":["Nhiệm vụ","Giao việc cho mình hoặc người khác"],"contacts":["Liên hệ","Gọi, nhắn tin, GPS và lịch sử thăm"],"notes":["Ghi chú nhanh","Sổ ghi tự lưu"],"planner":["Lịch trình","Việc cần làm theo ngày hoặc tuần"],"activity":["Hoạt động","Những gì bạn đã làm, từng tuần"],"profile":["Hồ sơ và cài đặt","Tài khoản và lựa chọn của bạn"]},"welcome":[["Chào mừng đến MyServiceTime","Đây là hướng dẫn một phút. Bạn có thể bỏ qua và xem lại bất cứ lúc nào bằng nút ❓."],["Menu","Chuyển giữa Trang chủ, Hoạt động và Tiến bộ ở đây. Chạm ☰ ở góc trên bên trái để mở công cụ (đếm giờ, cuộc hẹn, sự kiện…), nhắc nhở, cài đặt, trợ giúp và đăng xuất."],["Ngày của bạn trong một cái nhìn","Cuộc hẹn hôm nay, thời gian tuần này, nhiệm vụ đang mở và việc cần làm. Chạm vào ô để mở."],["Thêm nhanh","Thêm cuộc hẹn, nhiệm vụ, sự kiện, việc cần làm, liên hệ hoặc ghi chú chỉ với một chạm."],["Công cụ của bạn","Chạm ☰ và chọn một công cụ trong mục Công cụ — đếm giờ, cuộc hẹn, sự kiện, liên hệ, bản đồ… Mỗi công cụ mở trên trang riêng."],["Bật nhắc nhở","Chạm Bắt đầu nhắc nhở và cho phép thông báo: nhắc nhở đến dưới dạng thông báo, dù ứng dụng đang mở hay đóng."],["Luôn có trợ giúp","Chạm ❓ bất cứ lúc nào để xem lại hướng dẫn này hoặc học từng công cụ. Chúc một ngày tốt lành!"]],"appointments":[["Cuộc hẹn mới","Chạm vào đây để thêm cuộc hẹn hoặc lần thăm: tiêu đề, ngày, giờ, liên hệ, địa chỉ và nhắc nhở bằng chuông."],["Tìm thật nhanh","Tìm và lọc theo loại, ngày, liên hệ hoặc người được giao."],["Danh sách của bạn","Mỗi mục hiện thời gian đếm ngược. Bắt đầu đo giờ thăm, Ghi chú lưu điều đã xảy ra, và địa chỉ mở GPS."]],"tracker":[["Đếm giờ","Ghi việc bạn đang làm (và ghi chú), rồi bấm Bắt đầu. Tạm dừng bất cứ lúc nào; khi xong, bạn có thể thêm ghi chú trước khi lưu."],["Lịch thời gian","Mỗi ngày hiện thời gian bạn đã ghi. Chạm vào một ngày để xem các phiên và ghi chú."],["Thêm giờ bằng tay","Quên bật đồng hồ? Tự thêm thời gian và việc đã làm."],["Đến tháng bất kỳ","Chạm 📆 để chọn tháng và năm."]],"events":[["Sự kiện mới","Thêm Lễ Tưởng Niệm, hội nghị vòng quanh, hội nghị vùng, chuyến thăm của giám thị vòng quanh — hoặc tự nhập tên."],["Ngày và nhắc nhở","Sự kiện có thể kéo dài nhiều ngày, và nhắc bạn trước một tuần và trước một ngày."]],"assignments":[["Nhiệm vụ mới","Giao việc cho mình hoặc ai đó trong danh bạ, với hạn chót, giờ và mức ưu tiên."],["Đánh dấu xong","Chạm vào vòng tròn khi xong. Gửi chia sẻ qua tin nhắn hoặc email."]],"contacts":[["Liên hệ mới","Lưu những người bạn thăm: điện thoại, email, địa chỉ, mối quan hệ và ảnh."],["Thao tác một chạm","Gọi, nhắn tin, chỉ đường GPS, lên lịch thăm mới, giao việc hoặc xem lịch sử thăm."]],"notes":[["Ghi chú nhanh","Viết bất cứ điều gì — tự lưu. Địa chỉ thành liên kết GPS, và “Chèn địa chỉ” thêm một địa chỉ đã kiểm tra."]],"planner":[["Thêm việc cần làm","Nhập việc cho ngày đó. Thêm giờ nếu muốn được nhắc, hoặc đánh dấu “Không ngày” cho danh sách bất cứ lúc nào."],["Ngày hoặc tuần","Xem một ngày hoặc cả tuần, cùng cuộc hẹn, nhiệm vụ, sự kiện và thời gian đã ghi."]],"activity":[["Hoạt động trong tuần","Tổng của tuần và, từng ngày, mọi điều bạn ghi trong lịch thời gian. Dùng ◀ ▶ để xem tuần khác."],["Mọi điều bạn đã làm","Toàn bộ lịch sử, mới nhất trước. Lọc theo thời gian, cuộc hẹn, nhiệm vụ, sự kiện hoặc liên hệ."]],"profile":[["Hồ sơ của bạn","Đổi ảnh và tên, tư cách người công bố và quốc gia của bạn."],["Cài đặt","Ngôn ngữ, ngày đầu tuần, chuông, nhắc nhở mặc định và tải bản sao dữ liệu."]]};
if (TOUR_TEXT.en && TOUR_TEXT.en.events) TOUR_TEXT.en.events[1] = ["Dates and reminders","Events can last several days, and remind you a week and a day before."];
if (TOUR_TEXT.es && TOUR_TEXT.es.events) TOUR_TEXT.es.events[1] = ["Fechas y recordatorios","Los eventos pueden durar varios días y avisarte una semana y un día antes."];
if (TOUR_TEXT.fr && TOUR_TEXT.fr.events) TOUR_TEXT.fr.events[1] = ["Dates et rappels","Les événements peuvent durer plusieurs jours et vous prévenir une semaine et un jour avant."];
if (TOUR_TEXT.ht && TOUR_TEXT.ht.events) TOUR_TEXT.ht.events[1] = ["Dat ak rapèl","Yon evènman ka dire plizyè jou, epi li fè w sonje yon semèn ak yon jou anvan."];
if (TOUR_TEXT.pt && TOUR_TEXT.pt.events) TOUR_TEXT.pt.events[1] = ["Datas e lembretes","Os eventos podem durar vários dias e avisar você uma semana e um dia antes."];
if (TOUR_TEXT.de && TOUR_TEXT.de.events) TOUR_TEXT.de.events[1] = ["Daten und Erinnerungen","Ereignisse können mehrere Tage dauern und dich eine Woche und einen Tag vorher erinnern."];
if (TOUR_TEXT.it && TOUR_TEXT.it.events) TOUR_TEXT.it.events[1] = ["Date e promemoria","Gli eventi possono durare più giorni e avvisarti una settimana e un giorno prima."];
if (TOUR_TEXT.ru && TOUR_TEXT.ru.events) TOUR_TEXT.ru.events[1] = ["Даты и напоминания","События могут длиться несколько дней и напоминать за неделю и за день."];
if (TOUR_TEXT.ar && TOUR_TEXT.ar.events) TOUR_TEXT.ar.events[1] = ["التواريخ والتذكيرات","يمكن أن تستمر المناسبات عدة أيام، وتذكّرك قبلها بأسبوع ويوم."];
if (TOUR_TEXT.hi && TOUR_TEXT.hi.events) TOUR_TEXT.hi.events[1] = ["तारीख़ें और रिमाइंडर","कार्यक्रम कई दिन चल सकते हैं, और एक हफ़्ता व एक दिन पहले याद दिलाते हैं।"];
if (TOUR_TEXT.zh && TOUR_TEXT.zh.events) TOUR_TEXT.zh.events[1] = ["日期和提醒","活动可以持续几天，并会在一周前和一天前提醒你。"];
if (TOUR_TEXT.ja && TOUR_TEXT.ja.events) TOUR_TEXT.ja.events[1] = ["日程とリマインダー","行事は数日続くこともあり、1週間前と前日にお知らせします。"];
