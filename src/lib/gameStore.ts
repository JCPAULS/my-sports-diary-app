import { supabase } from '@/lib/supabase'
import {
  getAllGames as lsGetAll,
  saveGame as lsSave,
  deleteGame as lsDelete,
} from '@/lib/storage'
import { dbGameToGame, gameToDbGame, type DbGame } from '@/types/database'
import { processPhotoForSave, deleteGamePhotos } from '@/lib/photoStore'
import type { Game } from '@/types/Game'

async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export async function getAllGames(): Promise<Game[]> {
  const user = await getUser()
  if (!user) return lsGetAll()

  const { data, error } = await db
    .from('games')
    .select('*')
    .order('created_at', { ascending: false }) as { data: DbGame[] | null; error: unknown }

  if (error) throw error
  return (data ?? []).map(dbGameToGame)
}

export async function getGameById(id: string): Promise<Game | null> {
  const user = await getUser()
  if (!user) return lsGetAll().find((g) => g.id === id) ?? null

  const { data, error } = await db
    .from('games')
    .select('*')
    .eq('id', id)
    .single() as { data: DbGame | null; error: unknown }

  if (error) return null
  return dbGameToGame(data!)
}

export async function saveGame(game: Game): Promise<Game> {
  const user = await getUser()
  if (!user) {
    lsSave(game)
    return game
  }

  const processedPhotos = game.photos
    ? await Promise.all(game.photos.map((p) => processPhotoForSave(p, user.id, game.id)))
    : undefined

  const processedOutfitPhoto = game.outfitPhoto
    ? await processPhotoForSave(game.outfitPhoto, user.id, game.id)
    : undefined

  const gameToSave: Game = { ...game, photos: processedPhotos, outfitPhoto: processedOutfitPhoto }
  const dbPayload = gameToDbGame(gameToSave, user.id)

  const { data, error } = await db
    .from('games')
    .upsert(dbPayload, { onConflict: 'id' })
    .select()
    .single() as { data: DbGame | null; error: unknown }

  if (error) throw error
  return dbGameToGame(data!)
}

export async function updateGame(game: Game): Promise<Game> {
  return saveGame(game)
}

export async function deleteGame(id: string): Promise<void> {
  const user = await getUser()
  if (!user) {
    lsDelete(id)
    return
  }

  await deleteGamePhotos(user.id, id)

  const { error } = await db.from('games').delete().eq('id', id) as { error: unknown }
  if (error) throw error
}
