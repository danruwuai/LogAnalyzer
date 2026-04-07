$pwd = ConvertTo-SecureString -String "LogAnalyzer123" -Force -AsPlainText
Export-PfxCertificate -Cert "Cert:\CurrentUser\My\2FB37E92E3947EF38172EB5BBBB6DD3CB2709B68" -FilePath "C:\Users\zgj\.openclaw\workspace\LogAnalyzer\codesign.pfx" -Password $pwd
