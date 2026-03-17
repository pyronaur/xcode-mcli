.PHONY: lint lint-dry verify

lint:
	npm run lint

lint-dry:
	npm run lint-dry

verify:
	$(MAKE) lint-dry
	npm test
