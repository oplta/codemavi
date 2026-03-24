# Code Mavi IDE Project Rules

Bu dosya Code Mavi IDE Agent'larının uyması gereken proje özelindeki kuralları içerir.

## Genel Prensipler
- Kod kalitesi her şeyden önemlidir.
- DRY (Don't Repeat Yourself) prensibine uyun.
- TypeScript kullanılıyorsa 'any' tipinden kaçının.
- Fonksiyonlar tek bir iş yapmalı (Single Responsibility).

## Stil Kuralları
- İsimlendirmeler camelCase olmalıdır.
- Dosya isimleri kebab-case olmalıdır.
- Export'lar her zaman dosyanın sonunda yer almalıdır.

## Agent Davranışı
- Değişiklik yapmadan önce her zaman `read_file` ile dosyayı oku.
- Kritik değişikliklerde (3+ dosya) her zaman kullanıcıdan onay iste.
- Hata aldığında sessizce devam etme, hatayı açıkla ve çözüm öner.
