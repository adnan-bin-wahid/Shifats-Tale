import re

with open('src/components/layout/Navbar.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Fix desktop targetHref
code = code.replace('''                const targetHref =
                  item.href.startsWith("#") && pathname !== "/"
                    ? `/${item.href}`
                    : item.href;''', '''                const targetHref =
                  item.href?.startsWith("#") && pathname !== "/"
                    ? `/${item.href}`
                    : item.href || "#";''')

with open('src/components/layout/Navbar.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
