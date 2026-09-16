# backend/apps/whatsapp_assistant/bridge/sources/
# Deux sources interchangeables du catalogue (réglage WHATSAPP_CATALOG_SOURCE) :
#   local  : la base Belivay du serveur (ORM)
#   remote : l'API publique du site en ligne (ex. https://belivay.com)
# Chacune expose : category_tree(), product_ids_in_category(), search_product_ids(),
# products_by_ids().
