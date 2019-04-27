all: assets/ $(subst src/assets, assets, $(wildcard src/assets/*))

assets/:
	mkdir assets/

assets/%.js: src/assets/%.js
	terser -m -- "$<" > "$@"

assets/%.css: src/assets/%.css
	cleancss -O 2 "$<" > "$@"

assets/%.html: src/assets/%.html
	html-minifier --collapse-whitespace "$<" > "$@"

assets/%: src/assets/%
	cp "$<" "$@"
