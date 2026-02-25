 # Association L'Escale

pour une même donnée il peut y avoir différent nommination de la donnée (exemple: "Genre" ou "Sexe")

visites = le nombre de fois qu'une personne est entrée dans l'association
chaque visite a un ou plusieurs motifs

Fiche d'accueil de l'Escale:
- Nom
- Prénom
- Sexe (Homme, Femme)
- Nationalité
- Adresse
- Téléphone
- Mobile
- Email
- Date d'actualisation (Dernière date de mise à jour de la fiche)
- CSS (valeurs: [oui, non])
- RQTH (valeurs: [oui, non])
- Invalidité (valeurs: [oui, non])
    - Catégorie
- N° France Travail ( numéro d'utilisateur France Travail)
    - Date d'inscription France Travail
    - CP (code personnel)
- N° CAF (numéro d'allocataire CAF)
- Situation familliale (valeurs: [Marié(e), Célibataire, Divorcé(e), Séparé(e), Concubinage, Veuf(ve)])
- Nombre d'enfants à  charge
    - Leur(s) âges
- Mobilité
    - Permis de conduire (valeurs: [oui, non])
    - Véhicule personnel (valeurs: [oui, non])
    - Autre(s) moyen(s) de locomotion
- Hébergement
- Ressources (valeurs: [ARE, ASS, RSA, AAH, Invalidité, IJ, ASI, Salaire, Conjoint, Sans ressource])
- Orienté par (valeurs: [France Travail, CMS, Mairie, Connaissance, CMPA, Maison des Familles])


Chaque jour une personne à l'accueil est chargé de remplir un tableau pour faire le suivi des visites et du/des motifs de la visite.
Un petit commentaire peut être ajouté.

Le tableau a les colonnes suivantes:
- Date (date du jour)
- Genre  (Homme, Femme)
- Nom
- Prénom
- Visites
- Motif(s) (Objet(s) de la visite de l'Escale) (valeurs: [MSA/CAF, Santé, PASS, Logement, Mobilité, CV/LM, Emploi,  Recherches/Admin, Inscription réinscription France Travail, Création compte France Travail, Accompagnement numérique, Internet, Info(s)/Conseil(s), Autres: Lien social, Ateliers, Cours d'informatique,ASID])
- Orienté(e) par France Travail (valeurs: [oui, non])

France Travail:
    - Orienté par France Travail
    - Inscrit à France Travail
    - CV et LM: est ce que la personne est venue pour faire son CV et/ou LM
    - Recherche:
        - Consultation des offres
        - Fait ses candidatures à l'escale
    - Echanges administratifs avec France Travail
    - Numérique: est ce qu'il y a eu un accompagnement numérique (autonome ou pas)
    - Inscription: est ce que l'inscription s'est faite à l'escale
    - Ateliers: la personne participe aux ateliers collectifs?
    - Cours d'informatique: participe aux cours d'informatiques?
    - Droits (ouverture ou maintien): a fait des démarches pour l'ouverture ou le maintien des droits à l'escale
    - Elaboration de projet professionnel
    - ASID: en accompagnement ASID ou pas
    - ACCO Glo: accompagnement global de France Travail
    - Contrat de travail: est ce que pendant l'accompagnement à l'escale, la personne a trouvé un travail
        - type de contrat: CDI, CDD, CDDI, intérim
        - date de début
        - date de fin
        - employeur (ville siège et poste)
        - poste occupé


ENUM CPAM/ARS
CPAM/ARS (actuellement l'escale utilise le tableau d'accueil jour après jour)
    - ouverture et maintien des droits
        - dossier CSS
        - carte vitale
        - affiliation:
            - droits santé
            - mutuelle
        - invalidité
        - rattachement enfants
        - AME
    - accès au numérique
        - création compte AMELI/MSA
        - consultation et démarches sur les espaces personnels AMELI/MSA
    - démarches administratives
        - échange avec CPAM/MSA
        - impression et/ou envoi de documents
        - information sur les droits
    - accès aux soins et suivi du parcours santé
        - démarches d'accès aux soins
        - dossier MDPH
        - suivi de parcours de soin
        - bilan de santé (compter dans "accès aux soins et suivi du parcours santé" et dans "orientations partenaires/autres partenaires" parce que c'est l'escale qui accompagne)
    - orientations partenaires
        - CPAM/MSA
            - CRAMIF
            - santé au travail
        - MDPH
        - orientation et permanences PASS
        - autres partenaires (sous domaine interne à l'escale)
            - addictologie
            - maison des femmes
            - GEM/CMPA
            - médecins et centres de soins
            - centre de dépistage
    - santé mentale et soutien psychologique

ARS nombre de personne reçu en entretien individuel
    - pour une personne :
        - le nomrbre d'entretien lié aux sujets ENUM CPAM/ARS
        - nombres d'entretien total
        - nombre par valeur ENUM CPAM/ARS

Département (bilan)
    - nombre de personne (unique) reçues sur l'année
    - nombre d'homme, nombre de femme
    - nombre de suivi régulier (nombre de personnes venues plusieurs fois)
    - nombre de personnes de reçues de manière irrégulière
    - nombre de personnes dont on connait les ressources
    - nombre de personnes dont on ne connait pas les ressources
    - nombre de bénéficiaires du RSA suivis
    -tranches d'age
        - moins de 25 ans
        - de 25 à 29
        - de 30 à 34
        - de 25 à 39
        - de 40 à 44
        - de 45 à 49
        - de 50 à 54
        - de 55 à 60
        - plus de 60 ans
    - ateliers
        - nombre d'atelier par thème
        - nombre de participants
        - nombre d'allocataire du RSA

Actions collectives
    /!\ redynamisation ASID ...

    - thème: cours d'informatique, cinéma, socio-esthétique, randonnée, sport, piscine, budget, santé/environnement, cuisine, cuisine anti-gaspi, médiation équine, atelier créatif, culturel (jeux de société, visite, projet culturel itinérant, ...), noel, projet cinéma ...
    - prestataire:  au fil des seounes, la cuisine d'hélo, diététicienne
    - lieu: café culturel 109, l'escale, piscine, le studio, équisi...
    - liste des participants
    - nombre d'ateliers dans l'année
    - nombre de participants
    - nombre de participations (combien de la même personne a participé )

    -- qui/demande
        - le département demande:
            - le nombre d'atelier
            - le nombre de particants allocataire du RSA par atelier
            - le nombre total de participants par atelier
        - 

 FSE cf email
    - homme/femme
    - nouvelle entrée dans le dispositif FSE
    - ASID
    - type de ressources:
        - 


    il manque le nombre de personnes en: 
    - RQTH

ASID (suivi)
    Données
        - homme/femme
        - age
        - orientation N-1
        - orientation N
        - renouvellements N
        - suivi n-2 en cours
        - suivis réalisés (la personne adhère au suivi ou fort absent)
        - commune de résidence
        - prescripteur
        - référent
        - date d'entrée
        - date de renouvelleent
        - date de sortie
        - observation

    Démarches
        - santé
            - CSS
            - suivi santé
            - bilan de santé
            - soutien psy
        - mobilité
            - permis
                - oui
                - non
            - véhicule disponible
            - inscription auto-école
                - code
                - conduite
            - état du véhicule
                - bon
                - mauvais
            - BDI
                - voiture
                - permis
            - carte solidaire
        - logement
            - habitat indigne
            - déménagement ou accès logement
        - emploi
            - recherche d'emploi
            - cv et/ou lettre de motivation
            - offres d'emploi proposées
            - entretiens
            - contrat de travail
                - CDi
                - CDD
                - IAE
                - lieu
            - projet professionnel et/ou de formation
            - immersion
        - atelier de redynamisation
        - parentalité
            - enfants
            - mode de garde
            - partenaires
                - maison des familles
                - maison 1000 bulles
                - PMI
                - mission locale