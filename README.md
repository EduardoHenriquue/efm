# EducService Feedback Manager

O EducService Feedback Manager é um Complemento para o Google Formulários que realiza a correção de questões de Múltipla Escolha de um formulário e envia um e-mail com o feedback da correção para os respondentes, indicando seus acertos e erros. Envia também um e-mail ao(s) criador(es) do formulário com um relatório geral, informando a quantidade de respondentes, o desempenho dos respondentes nas questões do exercício, e as questões que os respondentes mais erraram, juntamente com a alternativa errada mais respondida pelos mesmos.

Observações:

* Para executar estes arquivos você deve criar um projeto na plataforma Google Apps Script <https://script.google.com> e adicionar estes arquivos no projeto criado.

* O Addon possui algumas restrições que serão discutidas logo abaixo.

1. Criação do Formulário:

* Adicionar uma caixa de texto para que o respondente insira o e-mail que ele deseja receber o feedback da correção.

* Enumerar cada questão de Múltipla Escolha. A questão deverá iniciar-se com um número, como em um exercício comum.

* Cada alternativa deverá iniciar-se com uma letra, também como é um exercício comum.

Exemplo de questão:
 * 1) Quem descobriu o brasil?
 * A. Américo Vespúcio
 * B. Pedro Álvares Cabral
 * C. Marechal Deodoro da Fonseca

Para criar o Gabarito basta selecionar a opção "Criar/Editar Gabarito" no menu da ferramenta.
