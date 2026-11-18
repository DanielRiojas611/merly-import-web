"use client";
/* eslint-disable @next/next/no-img-element */
import { useMemo, useState, type FormEvent, type SyntheticEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CART_STORAGE_KEY } from "./lib/cart-storage";
import type { Product } from "./catalogo/products";
import type { CommercialRules } from "./lib/commercial-rules";
import type { SiteContent } from "./lib/site-content-db";
import { BRAND_NAME, FACEBOOK_URL, SITE_DOMAIN } from "./lib/brand";
import { displayProductName, displayProductPresentation, productUnitLabel } from "./lib/product-utils";
import { withLeadOrigin } from "./lib/lead-origin";
import { siteAssets } from "./site-content";

type Segment = "bodega" | "minimarket" | "farmacia" | "distribuidor";
const audiences: Array<{key:Segment; label:string; description:string}> = [
  {key:"bodega",label:"Bodegas",description:"Productos de rotación diaria"},
  {key:"minimarket",label:"Minimarkets",description:"Surtido para tu tienda"},
  {key:"farmacia",label:"Boticas y farmacias",description:"Higiene y cuidado"},
  {key:"distribuidor",label:"Distribuidores",description:"Compra por volumen"},
];
const categories = [
  {eyebrow:"01 / HIGIENE ORAL", title:"Higiene oral",text:"Productos para el cuidado diario",image:siteAssets.categoryStories.oralCare,href:"/catalogo?buscar=crema+dental",tone:"sky"},
  {eyebrow:"02 / CUIDADO PERSONAL", title:"Cuidado personal",text:"Abastece tu mostrador",image:siteAssets.categoryStories.pharmacies,href:"/catalogo?filtro=higiene",tone:"peach"},
  {eyebrow:"03 / LIMPIEZA", title:"Limpieza y hogar",text:"Esenciales de alta rotación",image:siteAssets.categoryStories.cleaning,href:"/catalogo?filtro=limpieza",tone:"mint"},
  {eyebrow:"04 / PORTAFOLIO",title:"Marcas propias",text:"Conoce nuestras marcas",image:siteAssets.banners.ownBrands,href:"/catalogo?filtro=propias",tone:"lemon"},
];
function analytics(event:string, attributes:Record<string,string | number> = {}) {
  if (typeof window !== "undefined") (window as typeof window & { gtag?: (...args:unknown[])=>void }).gtag?.("event", event, attributes);
}
function money(value:number){return new Intl.NumberFormat("es-PE",{maximumFractionDigits:2}).format(value);}
function fallback(event:SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.onerror = null;
  event.currentTarget.src = "/products/product-placeholder.svg";
}
function matches(product:Product,segment:Segment) {
  const name=product.category.toLocaleLowerCase("es");
  if(segment==="farmacia")return name.includes("higiene")||name.includes("personal")||name.includes("salud");
  if(segment==="distribuidor")return product.ownBrand||Boolean(product.isFeatured);
  if(segment==="bodega")return !name.includes("industrial");
  return true;
}
function ProductCard({product,onQuickAdd}:{product:Product;onQuickAdd:(product:Product)=>void}) {
  const name=displayProductName(product.brand,product.name);
  const prices=product.quoteOnly?[]:[...product.tiers].sort((a,b)=>a.min-b.min);
  const first=prices[0];
  const search=new URLSearchParams({buscar:[product.brand,name].filter(Boolean).join(" ")});
  return <article className="wh-product">
    <div className="wh-product-image">{product.ownBrand?<span className="wh-tag">Marca propia</span>:null}
      <img src={product.image || "/products/product-placeholder.svg"} alt={[product.brand,name].filter(Boolean).join(" ")} loading="lazy" onError={fallback} />
    </div>
    <div className="wh-product-detail">
      <span className="wh-brand-name">{product.brand || "Merly Import"}</span>
      <h3>{name}</h3>
      <p>{displayProductPresentation(product.presentation)}</p>
      <div className="wh-product-meta">{first?<><strong>S/ {first.price.toFixed(2)}</strong><span>por {productUnitLabel(product,1).replace(/^1\s+/,"")}</span></>:<><strong>Precio mayorista</strong><span>Consultar según volumen</span></>}</div>
      <Link className="wh-product-detail-link" href={"/catalogo?"+search.toString()} onClick={()=>analytics("product_view",{product:name})}>Ver presentación <span aria-hidden="true">↗</span></Link>
      <button className="wh-quickadd" type="button" onClick={()=>onQuickAdd(product)}>+ Agregar a cotización</button>
    </div>
  </article>;
}

export default function WholesaleHome({content,featuredProducts,whatsappNumber,commercialRules,previewMode=false}:{
  content:SiteContent;featuredProducts:Product[];whatsappNumber:string;commercialRules:CommercialRules;previewMode?:boolean;
}) {
  const router=useRouter();
  const [menuOpen,setMenuOpen]=useState(false);
  const [segment,setSegment]=useState<Segment>("bodega");
  const [campaignIndex,setCampaignIndex]=useState(0);
  const campaigns=useMemo(()=>content.banners.filter(b=>b.isActive).sort((a,b)=>a.sortOrder-b.sortOrder),[content.banners]);
  const campaign=campaigns[campaignIndex%Math.max(1,campaigns.length)]??campaigns[0];
  const featured=useMemo(()=>{
    const first=featuredProducts.filter(p=>matches(p,segment));
    const others=featuredProducts.filter(p=>!first.some(x=>x.id===p.id));
    return [...first,...others].slice(0,8);
  },[featuredProducts,segment]);
  const contact=content.settings.contact;
  const labels=content.settings.labels;
  const number="https://wa.me/"+whatsappNumber;
  const quoteLink=number+"?text="+encodeURIComponent(withLeadOrigin("Hola, equipo de Merly Import. Quiero cotizar productos al por mayor."));
  const minimumOwn=money(commercialRules.freeDeliveryOwnBrands);
  const minimumMixed=money(commercialRules.freeDeliveryMixed);
  function quickAdd(product:Product){
    const fallbackQuery=new URLSearchParams({buscar:[product.brand,displayProductName(product.brand,product.name)].filter(Boolean).join(" ")});
    const fallbackUrl="/catalogo?"+fallbackQuery.toString();
    if(!/^[a-zA-Z0-9._-]{1,120}$/.test(product.id)){router.push(fallbackUrl);return;}
    try {
      const raw=window.localStorage.getItem(CART_STORAGE_KEY);
      const parsed:unknown=raw?JSON.parse(raw):{};
      const next:Record<string,unknown>=parsed&&typeof parsed==="object"&&!Array.isArray(parsed)?{...parsed as Record<string,unknown>}:{};
      const previous=Number(next[product.id]);
      const valid=Number.isFinite(previous)&&Number.isInteger(previous)&&previous>=1?previous:0;
      next[product.id]=Math.min(999,valid+1);
      window.localStorage.setItem(CART_STORAGE_KEY,JSON.stringify(next));
      analytics("catalog_add_to_quote",{item_id:product.id,item_brand:product.brand,placement:"homepage",quantity:next[product.id] as number});
      router.push("/catalogo");
    } catch {
      router.push(fallbackUrl);
    }
  }
  function sendForm(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const values=new FormData(event.currentTarget);
    const name=String(values.get("name")??"").trim().slice(0,100);
    const location=String(values.get("location")??"").trim().slice(0,100);
    const product=String(values.get("product")??"").trim().slice(0,180);
    const amount=String(values.get("quantity")??"").trim().slice(0,60);
    const message=["Hola, equipo de "+BRAND_NAME,"Quiero una cotización mayorista:","",
      "Nombre o negocio: "+name,"Ubicación: "+location,"Producto: "+product,
      "Cantidad: "+(amount||"Por definir"),"",
      "Por favor, confirmen precio, disponibilidad y condiciones de entrega."].join("\n");
    analytics("lead_submit",{product,placement:"wholesale_home"});
    window.open(number+"?text="+encodeURIComponent(withLeadOrigin(message)),"_blank","noopener,noreferrer");
  }
  if(!campaign)return null;
  return <main className="merly-wholesale">
    {previewMode?<div className="wh-preview-note">Vista previa del editor · contenido no publicado</div>:null}
    <div className="wh-topbar"><div className="wh-container">
      <span><strong>MERLY IMPORT</strong> · Surtido mayorista para tu negocio</span>
      <span className="wh-topbar-second">Lima y provincias · Despacho coordinado</span>
      <a href={quoteLink} target="_blank" rel="noreferrer" onClick={()=>analytics("whatsapp_click",{placement:"topbar"})}>Atención por WhatsApp ↗</a>
    </div></div>
    <header className="wh-header"><div className="wh-container wh-header-row">
      <Link className="wh-logo" href="/" aria-label="Merly Import, inicio"><img src={siteAssets.logo} alt="Merly Import"/></Link>
      <form className="wh-main-search" action="/catalogo" role="search">
        <label className="wh-sr-only" htmlFor="wh-search">Buscar en el catálogo</label>
        <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>
        <input id="wh-search" type="search" name="buscar" maxLength={100} placeholder="¿Qué producto necesitas? Busca por marca o presentación"/>
        <button type="submit">{labels.searchButton}<span>→</span></button>
      </form>
      <a className="wh-sales" href={quoteLink} target="_blank" rel="noreferrer" onClick={()=>analytics("whatsapp_click",{placement:"header"})}><span>Atención comercial</span><strong>Hablar con ventas ↗</strong></a>
      <button className="wh-nav-toggle" type="button" aria-label={menuOpen?"Cerrar menú":"Abrir menú"} aria-expanded={menuOpen} onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?"✕":"☰"}</button>
    </div><nav className={"wh-nav"+(menuOpen?" wh-nav-open":"")} aria-label="Navegación principal"><div className="wh-container">
      <Link className="wh-nav-main" href="/catalogo" onClick={()=>setMenuOpen(false)}>☷ Todas las categorías</Link>
      <Link href="/catalogo?filtro=propias" onClick={()=>setMenuOpen(false)}>Marcas propias</Link>
      <a href="#categorias" onClick={()=>setMenuOpen(false)}>Explorar categorías</a>
      <a href="#productos" onClick={()=>setMenuOpen(false)}>Productos destacados</a>
      <a href="#entregas" onClick={()=>setMenuOpen(false)}>Envíos y cobertura</a>
      <a href="#cotizar" onClick={()=>setMenuOpen(false)}>Cotizar pedido</a>
    </div></nav></header>
    <section className="wh-firstfold"><div className="wh-container">
      <div className="wh-hero-grid">
        <div className="wh-hero-core">
          <div className="wh-hero-copy">
            <span className="wh-eyebrow"><span className="wh-dot"/> ABASTECIMIENTO PARA NEGOCIOS</span>
            <h1>Haz que tu negocio tenga <strong>de todo.</strong></h1>
            <p>Higiene, limpieza y cuidado personal al por mayor. Explora productos, selecciona cantidades y cotiza sin complicaciones.</p>
            <div className="wh-hero-actions">
              <Link href="/catalogo" className="wh-cta-orange">Ver catálogo mayorista <span>↗</span></Link>
              <a href="#cotizar" className="wh-cta-outline">Solicitar cotización</a>
            </div>
            <div className="wh-hero-caption">Sin registro · Confirmación por WhatsApp · Entregas coordinadas</div>
          </div>
          <div className="wh-hero-products" aria-label="Muestra de productos">
            <div className="wh-photo wh-photo-main"><img src={siteAssets.banners.ownBrands} alt="Productos mayoristas del catálogo" onError={fallback}/></div>
            <div className="wh-photo wh-photo-small"><img src={siteAssets.categoryStories.pharmacies} alt="Productos de cuidado personal"/></div>
            <span className="wh-product-stamp">MÁS<br/><strong>SURTIDO</strong><br/>PARA TI</span>
          </div>
        </div>
        <div className="wh-hero-promos">
          <a href={content.settings.sideBanners.presale.ctaHref} className="wh-promo wh-promo-top">
            <div><span>{content.settings.sideBanners.presale.kicker}</span><h2>{content.settings.sideBanners.presale.title}</h2><b>{content.settings.sideBanners.presale.ctaLabel} ↗</b></div>
            <img src={content.settings.sideBanners.presale.imageUrl||siteAssets.banners.presale} alt="" loading="lazy"/>
          </a>
          <a href={content.settings.sideBanners.delivery.ctaHref} className="wh-promo wh-promo-bottom">
            <div><span>{content.settings.sideBanners.delivery.kicker}</span><h2>{content.settings.sideBanners.delivery.title}</h2><b>{content.settings.sideBanners.delivery.ctaLabel} ↗</b></div>
            <img src={content.settings.sideBanners.delivery.imageUrl||siteAssets.banners.coordinatedDelivery} alt="" loading="lazy"/>
          </a>
        </div>
      </div>
      <div className="wh-benefits">
        <article><span>01</span><div><strong>Mayorista de verdad</strong><p>Presentaciones y pedidos según volumen</p></div></article>
        <article><span>02</span><div><strong>Tu selección en minutos</strong><p>Elige productos y cantidades en el catálogo</p></div></article>
        <article><span>03</span><div><strong>Atención directa</strong><p>Confirma tu solicitud con el equipo comercial</p></div></article>
      </div>
    </div></section>
    <section className="wh-categories wh-section" id="categorias"><div className="wh-container">
      <div className="wh-section-heading"><div><span>ENCUENTRA MÁS RÁPIDO</span><h2>Compra por categoría</h2><p>Ingresa directamente al tipo de producto que tu negocio necesita.</p></div><Link href="/catalogo">Todo el catálogo ↗</Link></div>
      <div className="wh-category-grid">{categories.map(item=><Link href={item.href} className={"wh-category wh-category-"+item.tone} key={item.title}>
        <div><small>{item.eyebrow}</small><h3>{item.title}</h3><p>{item.text}</p><span>Explorar <b>↗</b></span></div>
        <img src={item.image} alt="" loading="lazy"/>
      </Link>)}</div>
    </div></section>
    <section className="wh-products wh-section" id="productos"><div className="wh-container">
      <div className="wh-section-heading"><div><span>SELECCIÓN PARA COMPRAR AL POR MAYOR</span><h2>Productos para reponer hoy</h2><p>Encuentra presentaciones y solicita precios según volumen.</p></div><Link href="/catalogo">Ver más productos ↗</Link></div>
      <div className="wh-audiences" role="group" aria-label="Tipo de negocio">{audiences.map(a=><button key={a.key} className={segment===a.key?"active":""} aria-pressed={segment===a.key} type="button" onClick={()=>{setSegment(a.key);analytics("segment_selected",{segment:a.key});}}><strong>{a.label}</strong><small>{a.description}</small></button>)}</div>
      {featured.length?<div className="wh-product-grid">{featured.map(product=><ProductCard key={product.id} product={product} onQuickAdd={quickAdd}/>)}</div>:<p className="wh-empty">Consulta el catálogo para ver las opciones disponibles.</p>}
      <div className="wh-viewall"><Link className="wh-cta-orange" href="/catalogo">Explorar catálogo completo <span>↗</span></Link></div>
    </div></section>
    <section className="wh-campaign wh-section"><div className="wh-container wh-campaign-grid">
      <div className="wh-campaign-img"><img src={campaign.imageUrl||siteAssets.banners.ownBrands} alt={"Campaña "+campaign.kicker} onError={fallback}/></div>
      <div className="wh-campaign-copy"><span>CAMPAÑA DESTACADA · {campaign.kicker}</span><h2>{campaign.title}</h2><p>{campaign.body}</p><Link href={campaign.ctaHref} onClick={()=>analytics("banner_click",{banner:campaign.kicker})}>{campaign.ctaLabel} <b>↗</b></Link>
        {campaigns.length>1?<div className="wh-campaign-pagination"><span>{campaignIndex%campaigns.length+1} / {campaigns.length}</span><button aria-label="Campaña anterior" type="button" onClick={()=>setCampaignIndex(i=>(i+campaigns.length-1)%campaigns.length)}>←</button><button aria-label="Campaña siguiente" type="button" onClick={()=>setCampaignIndex(i=>(i+1)%campaigns.length)}>→</button></div>:null}
      </div>
    </div></section>
    <section className="wh-process wh-section" aria-labelledby="wh-how"><div className="wh-container">
      <div className="wh-section-heading"><div><span>COMPRA SIMPLE</span><h2 id="wh-how">Del catálogo a tu cotización</h2><p>El proceso diseñado para compras mayoristas, sin cuentas ni pagos en línea.</p></div></div>
      <div className="wh-process-grid">
        <article><span>1</span><h3>Busca tus productos</h3><p>Filtra por nombre, marca o categoría y revisa las presentaciones.</p></article>
        <article><span>2</span><h3>Prepara tu lista</h3><p>Agrega lo que necesitas e indica las cantidades.</p></article>
        <article><span>3</span><h3>Confirma por WhatsApp</h3><p>El equipo confirma precios, stock y condiciones antes de cerrar el pedido.</p></article>
      </div>
    </div></section>
    <section className="wh-delivery wh-section" id="entregas"><div className="wh-container wh-delivery-grid">
      <div className="wh-delivery-intro"><span>LOGÍSTICA Y ENTREGA</span><h2>Abastecimiento que llega donde lo necesitas.</h2><p>Coordinamos la modalidad de entrega según el destino y las condiciones comerciales de tu pedido.</p><a href="#cotizar">Consultar disponibilidad de entrega ↗</a></div>
      <div className="wh-delivery-tiles">
        <article><span>📍 LIMA</span><h3>Delivery coordinado</h3><p>Sin costo desde S/ {minimumOwn} en marcas propias o S/ {minimumMixed} en pedidos mixtos, sujeto a cobertura.</p></article>
        <article><span>🚚 PROVINCIAS</span><h3>Entrega en agencia</h3><p>Coordinamos el despacho a la agencia elegida. El cliente asume el flete interprovincial.</p></article>
      </div>
    </div></section>
    <section className="wh-lead wh-section" id="cotizar"><div className="wh-container wh-lead-grid">
      <div><span className="wh-lead-kicker">HABLEMOS DE TU NEGOCIO</span><h2>¿Listo para abastecerte?</h2><p>Indícanos qué necesitas y deja lista tu consulta. El mensaje se abre en WhatsApp para que lo revises antes de enviarlo.</p><div className="wh-lead-contact"><strong>Contacto comercial</strong><a href={quoteLink} target="_blank" rel="noreferrer">{contact.phoneLabel} ↗</a></div></div>
      <form className="wh-lead-form" onSubmit={sendForm}><h3>Solicita una cotización</h3><p>Datos básicos, sin crear una cuenta.</p>
        <div className="wh-form-two"><label>Nombre o negocio<input required name="name" maxLength={100} placeholder="Nombre o razón comercial" autoComplete="organization"/></label><label>Distrito o provincia<input required name="location" maxLength={100} placeholder="Ej. Comas, Lima" autoComplete="address-level2"/></label></div>
        <label>Producto que necesitas<input required name="product" maxLength={180} placeholder="Ej. Paños húmedos por caja"/></label>
        <label>Cantidad aproximada (opcional)<input name="quantity" maxLength={60} placeholder="Ej. 20 cajas"/></label>
        <button type="submit">{labels.quoteButton} <span>↗</span></button><small>Los precios y la disponibilidad se confirman antes de cerrar el pedido.</small>
      </form>
    </div></section>
    <footer className="wh-footer"><div className="wh-container wh-footer-grid">
      <div className="wh-footer-about"><img src={siteAssets.logo} alt="Merly Import"/><p>Distribución mayorista de higiene, limpieza y cuidado personal para negocios de Lima y provincias.</p></div>
      <div><strong>Comprar</strong><Link href="/catalogo">Catálogo mayorista</Link><Link href="/catalogo?filtro=propias">Marcas propias</Link><Link href="/distribuidor">Distribuidores</Link></div>
      <div><strong>Información</strong><a href="#entregas">Entregas</a><a href="#categorias">Categorías</a><Link href="/privacidad">Privacidad</Link></div>
      <div><strong>Contacto</strong><a href={quoteLink} target="_blank" rel="noreferrer">WhatsApp {contact.phoneLabel}</a><a href={"mailto:"+contact.email}>{contact.email}</a><a href={content.settings.facebookUrl||FACEBOOK_URL} target="_blank" rel="noreferrer">Facebook ↗</a>{content.settings.tiktokUrl?<a href={content.settings.tiktokUrl} target="_blank" rel="noreferrer">TikTok ↗</a>:null}</div>
    </div><div className="wh-container wh-footer-end"><span>© 2026 {BRAND_NAME} · {SITE_DOMAIN}</span><span>Información comercial sujeta a confirmación.</span></div></footer>
    <a className="wh-wa-float" href={quoteLink} target="_blank" rel="noreferrer" onClick={()=>analytics("whatsapp_click",{placement:"floating"})} aria-label="Cotizar por WhatsApp">✆ <span>Cotizar</span></a>
  </main>;
}