USE LuminaDB;
GO

-- Eğer yarım kalan tablo varsa önce onu tamamen siler
IF OBJECT_ID('dbo.Isvecce', 'U') IS NOT NULL 
  DROP TABLE dbo.Isvecce;
GO

-- Hata vermemesi için çok geniş alanlara sahip yeni tabloyu yaratır
CREATE TABLE Isvecce (
    [Sıra] NVARCHAR(50),
    [Fransızca Kelime] NVARCHAR(500), -- Excel'de başlığın yanlışlıkla böyle kalmıştı, o yüzden böyle yazıyoruz
    [İsveççe Anlamı] NVARCHAR(500),
    [Türkçe Anlamı] NVARCHAR(MAX) -- MAX yazdığımız için artık asla sığmama hatası VEREMEZ
);
GO