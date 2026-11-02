// Source : tableau du ticket incubateur-ademe/aldo#204.
// `fichier` : chemin du PDF dans /static/fiches-actions/, absent tant que la fiche n'est pas publiée.
export interface FicheAction {
  type: 'Action' | 'Levier'
  secteur: string
  objectifs: string[]
  modalite: string
  nom: string
  leviers: string[]
  fichier?: string
}

const PROTEGER_AGRI = 'Protéger les stocks de carbone des terres agricoles'
const PRATIQUES_AGRI = 'Développer les pratiques agricoles stockant du carbone'
const EMPRISE_FORET = "Protéger l'emprise forestière"
const BOISER = 'Boiser et accompagner le boisement'
const SYLVICULTURE = 'Développer les pratiques sylvicoles stockant du carbone'
const URBANISME = "Réglementer et planifier la préservation des milieux dans les documents d'urbanisme (PLUi, SCoT…)"

const CONSO_AGRI = ['Lutte contre la consommation de terres agricoles']
const STOCKANTES = ['Pratiques agricoles stockantes', 'Agroforesterie']
const DEFRICHEMENT = ['Limitation du défrichement, du déboisement et des incendies']
const AFFORESTATION = ['Enfrichement et afforestation']
const GESTION_FORET = ['Gestion et exploitation forestière durable']
const MILIEUX = ['Lutte contre la dégradation des milieux naturels', 'Restauration et gestion des milieux naturels']

function action (secteur: string, objectifs: string[], modalite: string, nom: string, leviers: string[]): FicheAction {
  return { type: 'Action', secteur, objectifs, modalite, nom, leviers }
}

export const fichesActions: FicheAction[] = [
  action('Agriculture', [PROTEGER_AGRI], 'Connaître et diagnostiquer', 'Évaluer les risques de dégradation des stocks de carbone agricoles', CONSO_AGRI),
  action('Agriculture', [PROTEGER_AGRI], 'Sensibiliser et animer', 'Informer sur le rôle carbone des terres agricoles pour inciter à leur préservation', CONSO_AGRI),
  action('Agriculture', [PROTEGER_AGRI], 'Planifier et réglementer', 'Protéger la vocation agricole des terres riches en carbone', CONSO_AGRI),
  action('Agriculture', [PROTEGER_AGRI], 'Mener et financer des projets', 'Soutenir des projets valorisant et sécurisant les parcelles agricoles riches en carbone', CONSO_AGRI),
  action('Agriculture', [PRATIQUES_AGRI, PROTEGER_AGRI], 'Connaître et diagnostiquer', "Évaluer les stocks de carbone des terres agricoles et l'impact des pratiques", STOCKANTES),
  action('Agriculture', [PRATIQUES_AGRI], 'Connaître et diagnostiquer', 'Identifier les zones et les acteurs propices à la mise en place des pratiques stockant du carbone', STOCKANTES),
  action('Agriculture', [PRATIQUES_AGRI], 'Planifier et réglementer', "Intégrer les pratiques agricoles stockant du carbone dans les prescriptions environnementales s'appliquant aux terres privées", STOCKANTES),
  action('Agriculture', [PRATIQUES_AGRI], 'Planifier et réglementer', 'Mobiliser les leviers de contractualisation environnementale pour assurer des pratiques agricoles stockant du carbone sur les terres publiques', STOCKANTES),
  action('Agriculture', [PRATIQUES_AGRI], 'Mener et financer des projets', 'Soutenir, financer et expérimenter les pratiques agricoles stockant du carbone', STOCKANTES),
  action('Agriculture', [PRATIQUES_AGRI], 'Sensibiliser et animer', 'Communiquer au sujet des pratiques agricoles stockant du carbone', STOCKANTES),
  action('Agriculture', ['Développer les filières agricoles favorables au stockage carbone'], 'Transversal', 'Soutenir les filières induisant des pratiques agricoles stockant du carbone', ['Pratiques agricoles stockantes']),
  action('Forêts', [EMPRISE_FORET], 'Connaître et diagnostiquer', 'Réaliser un diagnostic forestier', DEFRICHEMENT),
  action('Forêts', [EMPRISE_FORET], 'Appliquer la réglementation', 'Tenir compte des stocks de carbone dans la réglementation des boisements', DEFRICHEMENT),
  action('Forêts', [EMPRISE_FORET], 'Appliquer la réglementation', "Tenir compte des stocks de carbone lors de l'application de la réglementation sur le défrichement", DEFRICHEMENT),
  action('Forêts', [EMPRISE_FORET], 'Planifier et réglementer', "Protéger les forêts dans les règlements d'urbanisme", DEFRICHEMENT),
  action('Forêts', [EMPRISE_FORET], 'Sensibiliser et animer', 'Sensibiliser aux enjeux du carbone forestier', DEFRICHEMENT),
  action('Forêts', [EMPRISE_FORET], 'Appliquer la réglementation', 'Mettre en place les règlements, outils et compétences de la lutte contre les incendies', DEFRICHEMENT),
  action('Forêts', [EMPRISE_FORET], 'Appliquer la réglementation', "Protéger les formations linéaires boisées, les haies et les alignements d'arbres", DEFRICHEMENT),
  action('Forêts', [BOISER], 'Connaître et diagnostiquer', 'Identifier et flécher du foncier pour des projets de boisement', AFFORESTATION),
  action('Forêts', [BOISER], 'Sensibiliser et animer', 'Informer des aides au boisement et au renouvellement forestier', AFFORESTATION),
  action('Forêts', [BOISER], 'Sensibiliser et animer', 'Proposer un accompagnement technique aux projets de boisement et de renouvellement forestier', AFFORESTATION),
  action('Forêts', [BOISER], 'Mener et financer des projets', 'Financer les projets de boisement et de renouvellement forestier portés par des tiers', AFFORESTATION),
  action('Forêts', [BOISER], 'Mener et financer des projets', 'Porter des projets de boisement ou de renouvellement forestier', AFFORESTATION),
  action('Forêts', [BOISER], 'Sensibiliser et animer', 'Sensibiliser aux enjeux des boisements compensatoires', AFFORESTATION),
  action('Forêts', [SYLVICULTURE], 'Mener et financer des projets', 'Accompagner les plans de gestion durable des forêts', GESTION_FORET),
  action('Forêts', [SYLVICULTURE], 'Sensibiliser et animer', "Intégrer l'enjeu carbone dans les démarches de mise en gestion de la forêt", GESTION_FORET),
  action('Forêts', [SYLVICULTURE], 'Mener et financer des projets', 'Soutenir les pratiques sylvicoles durables', GESTION_FORET),
  action('Urbanisme', [URBANISME], '', 'Définir des zonages de protection et intégrer la séquestration carbone dans le règlement et les documents graphiques du PLU(i)', MILIEUX),
  action('Urbanisme', [URBANISME], '', 'Tenir compte de la séquestration carbone et des sols dans le SCoT', MILIEUX),
  action('Transversal', [], '', 'Tenir compte du stockage carbone dans le développement des énergies renouvelables et la valorisation des déchets verts', [])
]

export interface FiltresFiches {
  type?: string
  secteur?: string
  objectif?: string
  modalite?: string
}

export function filtrerFiches (fiches: FicheAction[], filtres: FiltresFiches): FicheAction[] {
  return fiches.filter((fiche) =>
    (!filtres.type || fiche.type === filtres.type) &&
    (!filtres.secteur || fiche.secteur === filtres.secteur) &&
    (!filtres.objectif || fiche.objectifs.includes(filtres.objectif)) &&
    (!filtres.modalite || fiche.modalite === filtres.modalite)
  )
}

function valeursUniques (valeurs: string[]): string[] {
  return [...new Set(valeurs.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'))
}

export const optionsFiltres = {
  type: valeursUniques(fichesActions.map((f) => f.type)),
  secteur: valeursUniques(fichesActions.map((f) => f.secteur)),
  objectif: valeursUniques(fichesActions.flatMap((f) => f.objectifs)),
  modalite: valeursUniques(fichesActions.map((f) => f.modalite))
}
