import { FileText } from "lucide-react";

type PreviewProduct = {
  id: string;
  name?: string | null;
  name_lv?: string | null;
  image_url?: string | null;
  price?: number | null;
  color_variants?: Array<{ images?: string[] }> | null;
};

type PreviewPost = {
  title: string;
  excerpt?: string | null;
  content?: string | null;
  cover_image_url?: string | null;
};

function getProductImage(product: PreviewProduct) {
  return product.image_url || product.color_variants?.[0]?.images?.[0] || "/placeholder.svg";
}

function getProductName(product: PreviewProduct) {
  return product.name_lv || product.name || "Produkts";
}

export function BlogInlinePreview({ post, products }: { post: PreviewPost; products: PreviewProduct[] }) {
  return (
    <div className="bg-background text-foreground">
      <article className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
        {post.cover_image_url && (
          <div className="w-full aspect-video rounded-lg mb-6 bg-muted flex items-center justify-center overflow-hidden">
            <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-contain" />
          </div>
        )}

        <h1 className="font-display text-3xl sm:text-4xl mb-3">{post.title || "Bloga virsraksts"}</h1>

        {post.excerpt && (
          <p className="text-lg font-body text-muted-foreground mb-6">{post.excerpt}</p>
        )}

        {post.content ? (
          <div
            className="font-body text-foreground max-w-none [&_h1]:text-3xl [&_h1]:font-display [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-2xl [&_h2]:font-display [&_h2]:mt-3 [&_h2]:mb-2 [&_h3]:text-xl [&_h3]:font-display [&_h3]:mt-2 [&_h3]:mb-1 [&_p]:my-2 [&_p]:leading-relaxed [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        ) : (
          <div className="rounded-md border border-dashed border-border px-4 py-6 text-sm text-muted-foreground flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Raksta saturs vēl nav ievadīts.
          </div>
        )}

        {products.length > 0 && (
          <section className="mt-12 pt-8 border-t border-border">
            <h2 className="font-display text-2xl mb-4">Šī raksta dizaini</h2>
            <p className="text-sm text-muted-foreground font-body mb-6">
              Pieejami ierobežotu laiku — paspēj iegādāties pirms svētkiem.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {products.map((product) => (
                <div key={product.id} className="border border-border rounded-lg overflow-hidden bg-card">
                  <div className="aspect-square bg-white">
                    <img
                      src={getProductImage(product)}
                      alt={getProductName(product)}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-3 space-y-1.5">
                    <h3 className="font-body font-semibold text-sm leading-tight line-clamp-2">
                      {getProductName(product)}
                    </h3>
                    {typeof product.price === "number" && (
                      <p className="text-sm font-bold font-body">{product.price.toFixed(2).replace(".", ",")} €</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}