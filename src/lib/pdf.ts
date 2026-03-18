import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const MARGE_GAUCHE = 14
const MARGE_DROITE = 14
const LARGEUR_PAGE = 210
const LARGEUR_UTILE = LARGEUR_PAGE - MARGE_GAUCHE - MARGE_DROITE

/** Crée un document PDF A4 portrait */
export function creerPDF(): jsPDF {
  return new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
}

/** Ajoute un en-tête de document (titre + sous-titre + date de génération) */
export function ajouterEntete(doc: jsPDF, titre: string, sousTitre?: string): number {
  let y = 20

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(titre, MARGE_GAUCHE, y)
  y += 8

  if (sousTitre) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    doc.text(sousTitre, MARGE_GAUCHE, y)
    doc.setTextColor(0)
    y += 6
  }

  // Date de génération
  doc.setFontSize(8)
  doc.setTextColor(150)
  const dateGen = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  doc.text(`Document généré le ${dateGen}`, LARGEUR_PAGE - MARGE_DROITE, 15, { align: 'right' })
  doc.setTextColor(0)

  // Ligne séparatrice
  doc.setDrawColor(200)
  doc.setLineWidth(0.5)
  doc.line(MARGE_GAUCHE, y, LARGEUR_PAGE - MARGE_DROITE, y)
  y += 6

  return y
}

/** Ajoute un titre de section */
export function ajouterSectionTitre(doc: jsPDF, y: number, titre: string): number {
  y = verifierSautPage(doc, y, 15)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 64, 175) // bleu
  doc.text(titre, MARGE_GAUCHE, y)
  doc.setTextColor(0)
  y += 2
  doc.setDrawColor(191, 219, 254) // bleu clair
  doc.setLineWidth(0.3)
  doc.line(MARGE_GAUCHE, y, LARGEUR_PAGE - MARGE_DROITE, y)
  y += 5
  return y
}

/** Ajoute des champs clé-valeur sur 2 colonnes */
export function ajouterChamps(
  doc: jsPDF,
  y: number,
  champs: { label: string; valeur: string }[],
  colonnes: 1 | 2 = 2,
): number {
  doc.setFontSize(9)
  const largeurCol = colonnes === 2 ? LARGEUR_UTILE / 2 : LARGEUR_UTILE

  for (let i = 0; i < champs.length; i++) {
    const col = colonnes === 2 ? i % 2 : 0
    if (col === 0) {
      y = verifierSautPage(doc, y, 6)
    }

    const x = MARGE_GAUCHE + col * largeurCol

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80)
    doc.text(champs[i].label + ' :', x, y)

    const labelWidth = doc.getTextWidth(champs[i].label + ' : ')
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0)
    const valeurMaxWidth = largeurCol - labelWidth - 2
    const valeur = champs[i].valeur || '—'
    // Tronquer si trop long
    const texte = doc.getTextWidth(valeur) > valeurMaxWidth
      ? valeur.slice(0, Math.floor(valeurMaxWidth / doc.getTextWidth('a'))) + '…'
      : valeur
    doc.text(texte, x + labelWidth, y)

    if (colonnes === 1 || col === 1 || i === champs.length - 1) {
      y += 5
    }
  }

  return y + 2
}

/** Ajoute un tableau avec jspdf-autotable */
export function ajouterTableau(
  doc: jsPDF,
  y: number,
  colonnes: string[],
  lignes: (string | number)[][],
): number {
  y = verifierSautPage(doc, y, 20)

  autoTable(doc, {
    startY: y,
    head: [colonnes],
    body: lignes,
    margin: { left: MARGE_GAUCHE, right: MARGE_DROITE },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    theme: 'grid',
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (doc as any).lastAutoTable.finalY + 6
}

/** Ajoute la pagination "Page X / Y" sur toutes les pages */
export function ajouterPiedDePage(doc: jsPDF): void {
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(
      `Page ${i} / ${totalPages}`,
      LARGEUR_PAGE / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' },
    )
  }
}

/** Formate une date pour le PDF (DD/MM/YYYY) */
export function formaterDatePDF(date: Date | null | undefined): string {
  if (!date) return '—'
  const d = new Date(date)
  const j = String(d.getUTCDate()).padStart(2, '0')
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const a = d.getUTCFullYear()
  return `${j}/${m}/${a}`
}

/** Vérifie s'il faut un saut de page et en ajoute un si nécessaire */
function verifierSautPage(doc: jsPDF, y: number, espaceNecessaire: number): number {
  const hauteurPage = doc.internal.pageSize.getHeight()
  if (y + espaceNecessaire > hauteurPage - 20) {
    doc.addPage()
    return 20
  }
  return y
}
