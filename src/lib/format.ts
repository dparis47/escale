/**
 * Formate un numéro de téléphone avec des espaces tous les 2 chiffres.
 * "0612345678" → "06 12 34 56 78"
 * Retourne null si la valeur est vide/null.
 */
export function formaterTelephone(valeur: string | null | undefined): string | null {
  if (!valeur) return null
  const chiffres = valeur.replace(/\D/g, '')
  if (chiffres.length === 0) return valeur
  return chiffres.replace(/(\d{2})(?=\d)/g, '$1 ')
}

/**
 * Formate un numéro de sécurité sociale français (NIR).
 * "185057800608436" → "1 85 05 78 006 084 36"
 * Retourne null si la valeur est vide/null.
 */
export function formaterNumeroSecu(valeur: string | null | undefined): string | null {
  if (!valeur) return null
  const chiffres = valeur.replace(/\D/g, '')
  if (chiffres.length === 0) return valeur
  // Format : X XX XX XX XXX XXX CC
  const parties = [
    chiffres.slice(0, 1),
    chiffres.slice(1, 3),
    chiffres.slice(3, 5),
    chiffres.slice(5, 7),
    chiffres.slice(7, 10),
    chiffres.slice(10, 13),
    chiffres.slice(13, 15),
  ].filter((p) => p.length > 0)
  return parties.join(' ')
}
