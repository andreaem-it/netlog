import Link from "next/link";
import { requireUser } from "@/server/authorization/session";
import { listOwnAlbums } from "@/features/albums/queries";
import { CreateAlbumForm } from "@/features/albums/components/create-album-form";

export const metadata = { title: "Album" };

export default async function AlbumsPage() {
  const user = await requireUser();
  const albums = await listOwnAlbums(user.id);
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">I TUOI RICORDI</p>
          <h1>Album.</h1>
        </div>
      </div>
      <div className="content-columns">
        <section className="stack">
          {albums.length === 0 && (
            <p className="muted">Non hai ancora nessun album. Creane uno qui accanto.</p>
          )}
          {albums.length > 0 && (
            <div className="content-columns" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
              {albums.map((album) => (
                <Link key={album.id} href={`/album/${album.id}`} className="card stack" style={{ gap: 0 }}>
                  {album.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- plain <img>: app doesn't use next/image elsewhere.
                    <img
                      src={album.coverUrl}
                      alt=""
                      style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: "16px 16px 0 0" }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: 140, background: "var(--soft)", borderRadius: "16px 16px 0 0" }} />
                  )}
                  <div style={{ padding: 12 }}>
                    <strong>{album.title}</strong>
                    <p className="muted" style={{ margin: 0 }}>
                      {album.photoCount} foto
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
        <aside className="card card-body">
          <h2>Crea album</h2>
          <CreateAlbumForm />
        </aside>
      </div>
    </>
  );
}
