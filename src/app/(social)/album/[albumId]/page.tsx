import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { currentUser } from "@/server/authorization/session";
import { getAlbum } from "@/features/albums/queries";
import { deleteAlbumAction, deletePhotoAction } from "@/features/albums/actions";
import { RenameAlbumForm } from "@/features/albums/components/rename-album-form";
import { AddPhotosForm } from "@/features/albums/components/add-photos-form";

export const metadata = { title: "Album" };

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ albumId: string }>;
}) {
  const { albumId } = await params;
  const user = await currentUser();
  const album = await getAlbum(user?.id, albumId);
  if (!album) notFound();
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">
            {album.owner ? "IL TUO ALBUM" : `ALBUM DI ${album.ownerName.toUpperCase()}`}
          </p>
          <h1>{album.title}</h1>
        </div>
        {album.owner && (
          <form action={deleteAlbumAction.bind(null, albumId)}>
            <button className="button button-subtle" type="submit">
              Elimina album
            </button>
          </form>
        )}
      </div>
      {!album.owner && (
        <p className="muted">
          <Link href={`/u/${album.ownerUsername}`}>Vai al profilo di {album.ownerName}</Link>
        </p>
      )}
      <section
        className="content-columns"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", marginBottom: 24 }}
      >
        {album.photos.map((photo) => (
          <div key={photo.id} className="card" style={{ position: "relative" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- plain <img>: app doesn't use next/image elsewhere. */}
            <img
              src={photo.url}
              alt=""
              style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 16 }}
            />
            {album.owner && (
              <form
                action={deletePhotoAction.bind(null, albumId, photo.id)}
                style={{ position: "absolute", top: 8, right: 8 }}
              >
                <button
                  className="button button-subtle"
                  type="submit"
                  aria-label="Elimina foto"
                  style={{ padding: 6, minHeight: "auto" }}
                >
                  <Trash2 size={14} />
                </button>
              </form>
            )}
          </div>
        ))}
        {album.photos.length === 0 && <p className="muted">Nessuna foto in questo album.</p>}
      </section>
      {album.owner && (
        <div className="stack">
          <section className="card card-body">
            <h2>Rinomina album</h2>
            <RenameAlbumForm albumId={albumId} currentTitle={album.title} />
          </section>
          <section className="card card-body">
            <h2>Aggiungi foto</h2>
            <AddPhotosForm albumId={albumId} />
          </section>
        </div>
      )}
    </>
  );
}
