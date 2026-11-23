# Instruções para agentes de IA

## Uso do GitHub Actions

- Use workflows para build, testes, verificações, empacotamento, publicação e
  confirmação de deploy. Aguardar e verificar um deploy executado por outro
  serviço, como o AWS Amplify, faz parte da esteira. Defina um limite de espera
  compatível com o deploy.
- Não use Actions como scheduler, fila ou worker da aplicação. Execute
  sincronizações e outras rotinas operacionais recorrentes no ambiente
  responsável por elas. Em runners hospedados pelo GitHub com consumo medido,
  o tempo é arredondado para cima por job. Um job de 15 segundos contabiliza um
  minuto. Consulte a [tarifação dos runners](https://docs.github.com/en/billing/reference/actions-runner-pricing).
- Execute cargas prolongadas alheias à entrega, como renderização de vídeos
  e processamento de grandes lotes de dados, localmente ou em infraestrutura
  apropriada, inclusive quando forem manuais. Se a esteira precisar publicar o
  resultado, entregue o artefato já gerado.
- São permitidos workflows para manutenção pontual, como refresh ou cópia de
  banco entre ambientes, e para verificações agendadas do próprio repositório.
  Siga o fluxo normal de revisão do projeto. Ao propor um workflow específico,
  informe no PR a finalidade, o gatilho, a frequência, o trabalho executado no
  runner e a duração esperada, incluindo a espera por serviços externos.
