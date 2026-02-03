import re

import collections

def parse_production_data(filename):
    data = {}
    bundles = collections.defaultdict(list)
    with open(filename, 'r', encoding='utf-8') as f:
        for line in f:
            if '|' not in line or 'cadastral_number' in line or '---' in line:
                continue
            parts = line.split('|')
            if len(parts) >= 4:
                cn = parts[0].strip()
                try:
                    price = float(parts[1].strip())
                    is_primary = parts[2].strip() == 't'
                    bundle_id = parts[3].strip()
                    if bundle_id == "": bundle_id = None
                    
                    data[cn] = {
                        'price': price,
                        'is_primary': is_primary,
                        'bundle_id': bundle_id
                    }
                    if bundle_id:
                        bundles[bundle_id].append(cn)
                except ValueError:
                    continue
    return data, bundles

def parse_dump_prices(filename):
    prices = {}
    in_plots_copy = False
    with open(filename, 'r', encoding='utf-8') as f:
        for line in f:
            if line.startswith('COPY public.plots'):
                in_plots_copy = True
                continue
            if in_plots_copy:
                if line.startswith('\\.'):
                    in_plots_copy = False
                    continue
                parts = line.split('\t')
                if len(parts) >= 10:
                    cn = parts[2].strip()
                    price_str = parts[9].strip()
                    if price_str == '\\N' or not price_str:
                        price = 0.0
                    else:
                        try:
                            price = float(price_str)
                        except ValueError:
                            price = 0.0
                    prices[cn] = price
    return prices

if __name__ == "__main__":
    prod_data, prod_bundles = parse_production_data('production_audit_data_v2.txt')
    dump_prices = parse_dump_prices('dump.sql')
    
    updates = []
    
    for cn, p_data in prod_data.items():
        if p_data['bundle_id'] is None:
            if cn in dump_prices:
                d_price = dump_prices[cn]
                if abs(p_data['price'] - d_price) > 1:
                    updates.append((cn, d_price))
        elif p_data['is_primary']:
            bundle_plots = prod_bundles[p_data['bundle_id']]
            # Get all prices in dump for this bundle
            bundle_dump_prices = [dump_prices.get(bcn, 0) for bcn in bundle_plots]
            
            # Heuristic: If all non-zero prices are identical, it's likely a TOTAL price
            non_zero = [p for p in bundle_dump_prices if p > 0]
            if len(set(non_zero)) == 1:
                dump_target = non_zero[0]
            else:
                # If they are different, we sum them
                dump_target = sum(bundle_dump_prices)
            
            if abs(p_data['price'] - dump_target) > 1:
                updates.append((cn, dump_target))

    # Generate SQL
    print("-- Corrective Batch update (handling bundle totals correctly)")
    for cn, new_price in updates:
        print(f"UPDATE land_plots SET price = {new_price:.0f} WHERE cadastral_number = '{cn}';")
