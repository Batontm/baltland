import csv

with open('missing_in_prod.txt') as f:
    missing_in_prod = set(line.strip() for line in f if line.strip())

with open('missing_in_dump.txt') as f:
    missing_in_dump = set(line.strip() for line in f if line.strip())

dump_plots = {}
with open('/tmp/dump1_all_plots.csv', newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f, delimiter=';')
    for row in reader:
        cad = row.get('cadastral_number', '').strip()
        if cad:
            dump_plots[cad] = row

prod_plots = {}
with open('prod_all_plots.csv', newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f, delimiter=';')
    for row in reader:
        cad = row.get('cadastral_number', '').strip()
        if cad:
            prod_plots[cad] = row

# 1. В дампе, нет в prod
with open('analysis_missing_in_prod.csv', 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f, delimiter=';')
    w.writerow(['cadastral_number','area_sotok','address','price','price_per_sotka','status','comment'])
    for cad in sorted(missing_in_prod):
        r = dump_plots.get(cad, {})
        w.writerow([cad, r.get('area',''), r.get('address',''), r.get('price_public',''), r.get('price_per_sotka',''), r.get('status',''), r.get('comment','')])

# 2. В prod, нет в дампе
with open('analysis_missing_in_dump.csv', 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f, delimiter=';')
    w.writerow(['cadastral_number','area_sotok','location','district','price','is_active','has_coordinates','center_lat','center_lon','created_at'])
    for cad in sorted(missing_in_dump):
        r = prod_plots.get(cad, {})
        w.writerow([cad, r.get('area_sotok',''), r.get('location',''), r.get('district',''), r.get('price',''), r.get('is_active',''), r.get('has_coordinates',''), r.get('center_lat',''), r.get('center_lon',''), r.get('created_at','')])

# 3. Полное сравнение
with open('analysis_full_comparison.csv', 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f, delimiter=';')
    w.writerow(['cadastral_number','в_дампе','в_prod','area_dump','address_dump','price_dump','location_prod','district_prod','price_prod','is_active','has_coordinates'])
    for cad in sorted(set(dump_plots) | set(prod_plots)):
        d = dump_plots.get(cad, {})
        p = prod_plots.get(cad, {})
        w.writerow([cad,
            'да' if cad in dump_plots else 'нет',
            'да' if cad in prod_plots else 'нет',
            d.get('area',''), d.get('address',''), d.get('price_public',''),
            p.get('location',''), p.get('district',''), p.get('price',''),
            p.get('is_active',''), p.get('has_coordinates','')])

print('OK')
print('В дампе, нет в prod:', len(missing_in_prod))
print('В prod, нет в дампе:', len(missing_in_dump))
print('Всего уникальных:', len(set(dump_plots) | set(prod_plots)))
