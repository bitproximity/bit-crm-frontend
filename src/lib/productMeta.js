// Datos compartidos de la pantalla de Productos y servicios.
import { Package, Wrench, Wifi, Music2, Monitor, Mail, MessageCircle, Bell, Heart, ShoppingCart, Users, Receipt } from 'lucide-react';

// Ícono específico según palabras clave del nombre del producto; si no matchea nada, cae a Producto/Servicio genérico.
export function productIcon(name, type) {
  const n = (name || '').toLowerCase();
  if (n.includes('wifi')) return Wifi;
  if (n.includes('music') || n.includes('radio')) return Music2;
  if (n.includes('signage') || n.includes('cartel') || n.includes('pantalla')) return Monitor;
  if (n.includes('email') || n.includes('mail') || n.includes('getresponse')) return Mail;
  if (n.includes('whatsapp')) return MessageCircle;
  if (n.includes('push') || n.includes('notifica')) return Bell;
  if (n.includes('loyalty') || n.includes('fideliza')) return Heart;
  if (n.includes('ecommerce')) return ShoppingCart;
  if (n.includes('crm')) return Users;
  if (n.includes('factura') || n.includes('comision') || n.includes('setup')) return Receipt;
  return type === 'servicio' ? Wrench : Package;
}

export const CURRENCIES = ['USD', 'COP', 'MXN', 'PYG', 'DOP', 'EUR'];
export const BILLING_LABELS = { mensual: 'Mensual', anual: 'Anual', unico: 'Único' };
