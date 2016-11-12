
var ADDON_TITLE = 'EducService Feedback Manager';
// Contador dos alunos que obtiveram desempenho maior ou igual a 70%
var contMaiorDesemp = 0;
// Lista das questões que os alunos mais erraram
var questMaisErros = [];
// Variável global que rmazena o gabarito
var sheetGab = [];
// Armazena a quantidade de respostas para processar o feedback de correção
var qtdeRespostas = 0;
var qtdeRespondentes = 0;
var teacherFb = {};

function onOpen(e){
  e.authMode = ScriptApp.AuthMode.FULL; // Atribui autorização a todos os serviços
  FormApp.getUi()
    .createAddonMenu()
    .addItem('Corrigir Exercício', 'showCorrection')
    .addItem('Criar/Editar Gabarito', 'showSidebar')
    .addItem('Sobre', 'showAbout')
    .addToUi();  
}

function onInstall(e){
  onOpen(e);
}

function showCorrection() {
  var ui = HtmlService.createHtmlOutputFromFile('pagina_inicial.html')
      .setWidth(600)
      .setHeight(425)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .setTitle("Correção");
  FormApp.getUi().showModalDialog(ui, 'Correção do Exercício');  
}

function showSidebar() {
  var ui = HtmlService.createHtmlOutputFromFile('sidebar_gabarito.html')
           .setWidth(300)
           .setTitle('Gabarito');
  FormApp.getUi().showSidebar(ui);
}

function showAbout() {
  var ui = HtmlService.createHtmlOutputFromFile('about.html')
      .setWidth(600)
      .setHeight(425)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .setTitle("Sobre");
  FormApp.getUi().showModalDialog(ui, 'Sobre');  
}


function corrigirExercicio(){
  var acertos = [];
  var erros = [];
  // Armazena a quatidade de emails que forem sendo enviados para os alunos para saber se foram enviados emails para todos os alunos
  var qtdeEmailsEnviados = 0;
  
  var respostasGabarito = getRespostasGabarito(); // Recebe um Array com as respostas do Gabarito
  sheetGab = respostasGabarito; // armazena  a planilha de gabarito em uma variável global para ser utilizado posteriormente  
  // Obtém as respostas do formulário. As linhas equivalentes as respostas dos usuários
  var respostasForm = FormApp.getActiveForm().getResponses();
  qtdeRespostas = respostasForm.length; // Armazena a quantidade de respostas para processar o feedback de correção
  
  // Percorre todas as respotas dos usuários, linha por linha.
  // O i = qtdeRespondentes trata o problema de reenvio de correção, caso o professor aplique o formulário para diferentes turmas
  for(var i = qtdeRespondentes; i < respostasForm.length; i++){
    // Obtém cada item de respostas existente, ou seja, a linha com as respostas do usuário.
    // A linha contém um conjunto de colunas no qual se encontram as respostas da questão.
    var itensResposta = respostasForm[i].getItemResponses();
    var userMail = respostasForm[i].getRespondentEmail();
    var flagEmail = false; // Para sinalizar após obter o email do respondente
    var j = 0;
    
    // Percorre a tupla/linha referente à resposta de um aluno
    while(j < itensResposta.length){
      var item = itensResposta[j]; // Obtém o item de resposta 
      // Título da questão referente à resposta
      var tituloQuestao = item.getItem().getTitle();
      // Resposta do usuário de dada questão referente à coluna 'j'.
      var respostaUsuario = itensResposta[j].getResponse();
      
      if(flagEmail == false){
        // Variável com o título do campo E-mail em minúsculo
        var string = (respostaUsuario+"").toLowerCase();
        Logger.log("String minúsculo: "+string);
        // Verifica se há um caractere '@' na string e se contém a palavra 'mail'
        var arroba = string.indexOf("@");
        var mail = string.indexOf("mail");
        if(arroba != -1){
          var email = itensResposta[j].getResponse();
          // Uma vez encontrado o e-mail, muda a flag pra true para não entrar no if
          flagEmail = true;
          Logger.log("Pegou o e-mail");
          // incrementa a resposta do usuário para obter a string da célula depois do email
          respostaUsuario = itensResposta[j+1].getResponse();
          Logger.log("Resposta Usuário: " + respostaUsuario);
        }
      }
      
      // Obtém o número da questão
      var caractere = firstCaractere(tituloQuestao);
      // Verifica se é uma questão. Caso o primeiro caractere do título seja um número, está é uma questão.
      if(isNumber(caractere)){
        var flagQuestao = false;
        var cont = 0;
        // Procura a questão encontrada no gabarito
        while(flagQuestao == false){
          // Número da questão contida na planilha gabarito. Ex.: [[1,C], [2,A]]. Por isso esta disposição para os índices.
          var questaoGabarito = respostasGabarito[cont][0];
          // Verifica o número da questão no gabarito e assinala true quando encontrar.
          if(firstCaractere(tituloQuestao) == questaoGabarito){
            flagQuestao = true;
          } else{
            // Vai incrementando até encontrar a questão no gabarito para obter a resposta correta
            cont++;
          }
        }
        
        // Com a questão que irá ser corrigida encontrada, obtém-se a alternativa correta do gabarito
        var respostaCorreta = respostasGabarito[cont][1];
        // Comparação de respostas do gabarito e usuário.
        var respU = ((respostaUsuario+"").toLowerCase()).substring(0,1); // Variável temporária para armazenar a resposta do respondente
        var respC = (respostaCorreta+"").toLowerCase(); // Variável temporária para armazenar a resposta do gabarito
        if(respU == respC){
          // Obtém o número da questão
          var numeroDaQuestao = (tituloQuestao+"").substring(0,1);
          // Adiciona a questão e a alternativa correta na lista de acertos
          // Contador que envia o índice com valor acrescentado para o getAlternativa e que faz o
          // tratamento para não obter o item turma, que também é múltipla escolha. Deve obter apenas questões
          acertos.push('Questão: ' + tituloQuestao + '\nR: ' + getAlternativa(numeroDaQuestao, respostaCorreta));
        } else {
          // Adiciona o número da questão na lista das questões que os alunos mais erraram
          questMaisErros.push((tituloQuestao+"").substring(0,1));
          Logger.log('Questão errada: ' + tituloQuestao + '\nSua resposta: ' + respostaUsuario);
          // Adiciona a questão e a alternativa respondida pelo aluno na lista de erros
          erros.push('Questão: ' + tituloQuestao + '\nSua resposta: ' + respostaUsuario);
        }  
      } 
      // Incremento do while
      j++;
    } // fim while
    
    // Organiza as questões acertadas em uma variável
    var textoA = "";
    for(var k in acertos){
      textoA += acertos[k];
    } 
    // Organiza as questões que o aluno errou em forma de texto nesta variável
    var textoR = "";
    for(var l in erros){
      var qst = ((erros[l]+"").substring(9,10)); // Obtém o número da questão na lista de erros
      // respostasGabarito contém um array com as questões, onde a questão 1 está na posição 0
      var alternativa = getAlternativa(qst, respostasGabarito[qst-1][1])+"";
      textoR += '\n' + erros[l] + '\nResposta certa: ' + alternativa + '\n';
    }     
    // Recebe o percentual de acertos e erros passando o array de acertos como parâmetro
    var textoF = percentAcertos(acertos);
    
    /**
      Envio do feedback para o respondente
    */
    var destinatario = (typeof email === 'undefined' ? userMail : email);
    if(erros.length == 0){
      MailApp.sendEmail(destinatario, 'Correção Exercício: '+ FormApp.getActiveForm().getTitle(), textoF);
      qtdeEmailsEnviados++;
    } else {
      MailApp.sendEmail(destinatario, 'Correção Exercício: '+ FormApp.getActiveForm().getTitle(),
        textoF+'\n'+'Veja abaixo a(s) questão(ões) que você errou: \n' + textoR);
      qtdeEmailsEnviados++;
    }
    
    // Zera a lista de erros e acertos para iniciar a correção das respostas de um novo usuário
    acertos.length = 0;
    erros.length = 0;
  }
  
  // Atualiza o valor dos respondentes para resolver o problema de reenvio de correção,
  // caso o professor submeta o formulário para outra turma após a primeira correção.
  qtdeRespondentes += qtdeRespostas; 
  
  // Envio do feedback do professor
  feedbackProfessor();
}

/**
   Essa função recebe um array com as informações do gabarito e adiciona essas informações em uma planilha
*/
function criarOuEditarGabarito(gab){
  // Colunas onde serão adicionados o número da questão e a alternativa correta, respectivamente.
  var letrasColunasGab = ['A', 'B'];
  var name = "Gabarito - " + FormApp.getActiveForm().getTitle(); 
  var gabarito = getGabaritoByName(name); // Planilha de Gabarito
  var newGab = null;
  
  // Verifica se o gabarito está em modo de edição. Evita criar uma nova planilha, duplicando uma planilha de Gabarito existente
  var editMode = false;
  if(gabarito != null){
    editMode = true;
  }
  
  if(editMode){
    var sheet = gabarito.getSheets()[0];
    var range = sheet.getActiveRange();
    for(var i = 0; i < gab.length; i++){
      var cellQst = (letrasColunasGab[0]+(i+1))+""; // A1, A2, A3 ... Ai
      var cellAlt = (letrasColunasGab[1]+(i+1))+""; // B1, B2, B3 ... Bi
      var qst = (gab[i].questao+""); // Questão
      var alt = (gab[i].alternativa+"").toUpperCase(); // Alternativa correta informada no sidebar
      sheet.getRange(cellQst).setValue(qst);
      sheet.getRange(cellAlt).setValue(alt);
    }
  } else{
    newGab = SpreadsheetApp.create(name);
    for(var i = 0; i < gab.length; i++){
      var cellQst = (letrasColunasGab[0]+(i+1))+""; // A1, A2, A3 ... Ai
      var cellAlt = (letrasColunasGab[1]+(i+1))+""; // B1, B2, B3 ... Bi
      var qst = (gab[i].questao+""); // Questão
      var alt = (gab[i].alternativa+""); // Alternativa correta informada no sidebar
      newGab.getRange(cellQst).setValue(qst);
      newGab.getRange(cellAlt).setValue(alt);
    }
  }
  
  return editMode ? gabarito.getUrl() : newGab.getUrl();  
}

/**
  Pesquisa a Planilha de Gabarito pelo nome e retorna a planilha
*/
function getGabaritoByName(name){
  var find = false;
  var idGabarito = null;
  var files = DriveApp.getFilesByName(name);
  while(files.hasNext() && find == false){
    var planilha = files.next();
    if(planilha.getName().localeCompare(name) == 0){
      find = true;
      idGabarito = planilha.getId();
      break;
    }
  }
  
  var gabarito = null;
  if(idGabarito != null){
    gabarito = SpreadsheetApp.openById(idGabarito);
  }
  return idGabarito != null ? gabarito : null;
}

/**
  Retorna as questões de múltipla escolha do formulário
*/
function getAllQuestions(){
  var questoes = FormApp.getActiveForm().getItems(FormApp.ItemType.MULTIPLE_CHOICE);
  var arrayAux = [];
  for(var i = 0; i < questoes.length; i++){
    if(isNumber(firstCaractere((questoes[i].getTitle()+"")))){
      arrayAux.push((questoes[i].getTitle()+""));
    }
  }
  return arrayAux;
}

/**
  Essa função obtém e retorna as respostas da planilha gabarito
*/
function getRespostasGabarito(){
  var name = "Gabarito - " + FormApp.getActiveForm().getTitle(); 
  var gabarito = getGabaritoByName(name); // Planilha de Gabarito
  var sheet = gabarito.getActiveSheet();
  var range = sheet.getDataRange();
  var values = range.getValues();
  return gabarito != null ? values : null;
}

function isExistGab(){
  var name = "Gabarito - " + FormApp.getActiveForm().getTitle(); 
  var gabarito = getGabaritoByName(name); // Planilha de Gabarito  
  return gabarito != null ? true : false;
}

function getGabNameDefault(){
  var name = "Gabarito - " + FormApp.getActiveForm().getTitle();
  return name;
}

/*
   Retorna o primeiro caracter da string passada por parâmetro
*/
function firstCaractere(string){
  var caractere = (string+"").slice(0,1);
  return caractere;
}

/*
  Verifica se o caracter é um número e retorna true, caso não seja, retorna false
*/
function isNumber(caractere){
  // O método isNaN() retorna true caso o caractere não seja um número. (Not-a-Number)
  // Logo sua negação retorna true, caso o caractere seja número.
  return (!isNaN(parseFloat(caractere))) && isFinite(caractere);
}

/*
  Retorna apenas os itens de múltipla escolha que são questões (que possuem número identificador)
*/
function getQstMultipleChoice(){
  var questoes = FormApp.getActiveForm().getItems(FormApp.ItemType.MULTIPLE_CHOICE);
  var arrayAux = [];
  for(var i = 0; i < questoes.length; i++){
    if(isNumber(firstCaractere((questoes[i].getTitle()+"")))){
      arrayAux.push(questoes[i]);
    }
  }
  return arrayAux;
}

/*
    Retorna a alternativa da letra passada por parâmetro, buscando a alternativa pela questão também passada por parâmetro.
*/
function getAlternativa(numQuestao, letra){
  // Obtém as questões de múltipla escolha do formulário
  var questions = getQstMultipleChoice();
  // Variável para guardar o índice da questão do formulário
  var indice = getIndexQst(questions, numQuestao);
  // Obtém as alternativas da questão questão de múltipla escolha pelo seu número
  var choices = questions[indice].asMultipleChoiceItem().getChoices();
  
  // Busca a alternativa desejada nas alternativas da questão
  for(var j = 0; j < choices.length; j++){
    var alternativa = choices[j].getValue()+"";
    // Obtém a letra da alternativa da questão
    var choice = alternativa.substring(0,1);
    // Compara a letra da alternativa obtida anteriormente com a letra da alternativa passada por parâmetro
    if(choice == letra){
      // Retorna a alternativa inteira
      return alternativa;
    }
  }
}

/*
  Retorna as questões que os alunos mais erraram
*/
function getQuestoesMaisErros(arrayErros){
  var arrayAux = []; // Array temporário para armazenar as questões
  var arrayRepet = []; // Array para armazenar a quantidade de repetições de cada questão
  // for i: Adiciona os números existentes do arrayErros no arrayAux sem repetições
  for(var i = 0; i < arrayErros.length; i++){
    // Verifica se já foi adicionado algum elemento no array
    if(arrayAux.length >= 1){
      var flag = false; // Para sinalizar, caso dada questão já tenha sido armazenada
      // Verifica se a questão já foi adicionada no arrayAux evitando repetições, pois há questões repetidas
      for(var j = 0; j < arrayAux.length; j++){
        if(arrayAux[j] == arrayErros[i]){
          flag = true; // Sinaliza
        }
      }
      // Se não foi sinalizado, a questão ainda não foi adicionada
      if(flag == false){
        arrayAux.push(arrayErros[i]); // Adiciona a questão
      }
    } else {
      arrayAux.push(arrayErros[i]); // Adiciona o primeiro elemento do arrayAux
    }
  } // fim for i
  
  // for k: Conta as repetições de cada elemento do arrayErros e adicioná-os no arrayRepet em função do arrayAux
  // O elemento k do arrayAux terá n repetições no arrayErros, o número de repetições, cont, será armazenado no arrayRepet
  // no mesmo índice que o elemento k possui no arrayAux. Ex.: arrayAux = [1,2], arrayErros = [1,1,2,2,2] e arrayRepet = [2, 3]
  var cont = 0;
  for(var k = 0; k < arrayAux.length; k++){
    for(var l = 0; l < arrayErros.length; l++){
      if(arrayAux[k] == arrayErros[l]){
        cont++;
      }
    }
    arrayRepet.push(cont); // adiciona a quantidade de repetições do elemento k no arrayErros
    cont = 0; // zera o contador
  }
  
  // Obtém o elemento que mais se repete. Ou seja, o maior número do arrayRepet
  var maior = arrayRepet[0]; // Assume que o primeiro elemento é o maior
  var indiceMaior = 0; // guarda o índice do primeiro elemento
  var segundoMaior = 0; 
  var indiceSegundoMaior = 0;
  var aux = 0;
  var auxIndice = 0;
  // Percorre o arrayRepet em busca do maior elemento, representando a questão que teve mais repetições
  for(var m = 1; m < arrayRepet.length; m++){
    // Verifica se o elemento atual é maior que o elemento definido como maior
    if(arrayRepet[m] > maior){
      aux = maior; // Se for maior, armazena o antigo maior em uma variável auxiliar
      auxIndice = indiceMaior; // Guarda o índice do antigo maior em uma variável auxiliar
      maior = arrayRepet[m]; // Assume que o elemento atual é o maior
      indiceMaior = m; // Atualiza o índice do maior
      segundoMaior = aux; // O antigo maior, que estava armazenado na variável auxiliar, passa a ser o segundo maior
      indiceSegundoMaior = auxIndice; // O indice do antigo maior passa a ser o índice do segundo maior
    } 
    else if(arrayRepet[m] == maior){
      segundoMaior = arrayRepet[m];
      indiceSegundoMaior = m;
    } else {
      segundoMaior = arrayRepet[m];
      indiceSegundoMaior = m;
    }
  }
  
  if(arrayAux[indiceMaior] != arrayAux[indiceSegundoMaior]){ 
    // Definidas as duas questões que tiveram maior indice de erros.
    var questErro1 = getQuestao(arrayAux[indiceMaior]); // Obtém a questão que teve maior índice de erros pelo seu número
    var questErro2 = getQuestao(arrayAux[indiceSegundoMaior]); // Obtém a segunda questão que teve maior índice de erros pelo seu número
    // Texto com a alternativa errada das duas questões que os alunos mais responderam
    var textoA = getAlternativasMaisErraram(questErro1)+'\n\n';
    textoA += getAlternativasMaisErraram(questErro2);
    // Texto do Relatório de erros das questões
    var textoB = 'A seguir, um relatório geral dos erros cometidos por questão:\n';
    var textoC = 'A(s) questão(ões) que os alunos mais erraram foram: \n'+
      'Questão '+ firstCaractere(questErro1) +' e a Questão '+ firstCaractere(questErro2) +'\n\n'+textoB+'\n'+textoA;
    
    return textoC;
  } else {
    var questErro1 = getQuestao(arrayAux[indiceMaior]); // Obtém a questão que teve maior índice de erros pelo seu número
    // Texto com a alternativa errada da duas questões que os alunos mais responderam
    var textoA = getAlternativasMaisErraram(questErro1)+'\n\n';
    // Texto do Relatório de erros das questões
    var textoB = 'A seguir, um relatório geral dos erros cometidos por questão:\n';
    var textoC = 'A questão que os alunos mais erraram foi: \n'+
      'Questão '+ firstCaractere(questErro1) +'\n\n' + textoB + '\n'+textoA;
    
    return textoC;
  }
    
}

/*
  Obtém a questão do formulário pelo seu número
*/
function getQuestao(numQuestao){
  // Obtém a instância do formulário em atividade junto com as questões
  var questoes = FormApp.getActiveForm().getItems(FormApp.ItemType.MULTIPLE_CHOICE);
  // Variável para guardar o índice da questão do formulário
  var indice;
  // Varre o fomrulário procurando a questão passada como parâmetro
  for(var k=0; k < questoes.length; k++){
    var num = (questoes[k].getTitle()+"").substring(0,1);
    if(numQuestao == num){
      indice = k;
      break;
    }
  }
  var tituloQuestao = questoes[indice].getTitle();
  return tituloQuestao;
}

/**
   Retorna o índice de uma questão de múltipla escolha do formulário.
   @param {array} questions array com questões de múltipla escolha de um formulário.
   @param {string} numQst número da questão múltila escolha para retornar
   @return {string} índice da questão de múltipla escolha
*/
function getIndexQst(questions, numQst){
  // Variável para guardar o índice da questão do formulário
  var indice;
  // Varre o fomrulário procurando a questão passada como parâmetro
  for(var h=0; h < questions.length; h++){
    var num = (questions[h].getTitle()+"").substring(0,1);
    // Verifica se é o número da questão
    if(numQst == num){
      indice = h;
      break;
    }
  }
  return indice;
}


/*
   Retorna as alternativas que os alunos mais erraram da questão passada por parâmetro
*/
function getAlternativasMaisErraram(questao){
  var zero = 0;
  var cont = 0;
  var alternativas = [];
  // Obtém a instância do formulário em atividade junto com as questões
  var questoes = getQstMultipleChoice();
  // Obtém o número da questão
  var numQst = parseInt(firstCaractere(questao));
  
  // Variável para guardar o índice da questão do formulário
  var indice = getIndexQst(questoes, numQst);
  // Obtém as alternativas desta questão
  var choices = questoes[indice].asMultipleChoiceItem().getChoices();
  // Resposta correta da questão
  var respostaGab = sheetGab[numQst-1][1];
  
  // Obtém as respostas do formulário. As linhas equivalentes as respostas dos usuários
  var respostasForm = FormApp.getActiveForm().getResponses();
  // Percorre as respostas de todos os respondentes
  for(var i = 0; i < respostasForm.length; i++){
    // Obtém um array onde cada elemento é a resposta de uma questão do respondente i
    var itensResposta = respostasForm[i].getItemResponses();
    // Guarda o índice da resposta da questão passada por parâmetro
    var indexResponse1;
    
    // Estratégia para buscar as respostas de uma questão em uma planilha que tem as respostas desordenadas
    for(var j = 0; j < itensResposta.length; j++){
      for(var k = 0; k < choices.length; k++){
        // Verifica nas alternativas da questão o item de resposta de índice j
        if(itensResposta[j].getResponse() == choices[k].getValue()){
          // No índice j está a resposta da questão passada por parâmetro na planilha de respostas dos alunos
          indexResponse1 = j;
          break;
        }
      } // Fim for k
    } // Fim for j
    
    // A resposta da questão passada por parâmetro
    var item = itensResposta[indexResponse1].getResponse();
    // Obtém a letra da alternativa
    var resposta = firstCaractere(item);
    // Verifica se não é a resposta do Gabarito
    if(resposta != respostaGab){
      // Se não for, adiciona na lista de alternativas erradas
      alternativas.push(resposta);
    }
  } // Fim for i
  
  /*
     Passa a lista com as letras das alternativas que os alunos erraram para o método getAltMaisRepetida
     e recebe, como retorno, a(s) letra(s) da(s) alternativa(s) errada(s) mais respondida(s) pelo(s) aluno(s).
  */
  //Recebe as alternativas erradas respondidas pelos alunos juntamente com a ocorrência de cada uma. Objeto = {'alternativa','valor'}. valor = ocorrencia
  var altMaisRepetida = getAltMaisRepetida(alternativas);
  // Otém a alternativa correta
  var altCorreta = getAlternativa(numQst, respostaGab);
  
  // Caso seja mais de uma alternativa errada
  if(altMaisRepetida.length >= 2){
    var qtdOcorrency = 0;
    for(var z = 0; z < altMaisRepetida.length; z++){
        qtdOcorrency = qtdOcorrency + altMaisRepetida[z].valor;
    }
    // Quantidade de alunos que acertaram a questão = Total - alunos que erraram
    var qtdeAcertaram = respostasForm.length - qtdOcorrency;
    // percorrer com um for e separar cada letra de alternativa para jogar no texto
    var textoA = '\nQuestão '+questao+'\n\nResposta esperada: '+ altCorreta +' ('+ qtdeAcertaram +' aluno(s)). \n'+
    '\n'+ qtdOcorrency +' alunos erraram esta questão. As respostas erradas foram: ';
   
    // Itera o array das alternativas concatenando ao texto.
    for(var l = 0; l  < altMaisRepetida.length; l++){
      var alter = getAlternativa(numQst, altMaisRepetida[l].alternativa);
      var ocorrency = altMaisRepetida[l].valor+"";
      textoA += '\n' + alter + ' (' + ocorrency + ' aluno(s)).';
    }
    return textoA;
    // Se for apenas uma alternativa errada
  } else {
    // Obtém a alternativa errada mais respondida
    var altErrada = getAlternativa(numQst, altMaisRepetida.alternativa);
    // Conta a quantidade de alunos que responderam a alternativa errada e a correta
    var cont1 = 0;
    var cont2 = 0;
    for(var m = 0; m < respostasForm.length; m++){
      var itensResposta2 = respostasForm[m].getItemResponses(); 
      // Guarda o índice da resposta da questão passada por parâmetro
      var indexResponse2;
      
      for(var n = 0; n < itensResposta2.length; n++){
        for(var p = 0; p < choices.length; p++){
          if(itensResposta2[n].getResponse() == choices[p].getValue()){
            indexResponse2 = n;
            break;
          }
        }
      }
      var item2 = itensResposta2[indexResponse2].getResponse();
      if(item2 == altCorreta){
        cont1++;
      }
      else if(item2 == altErrada){
        cont2++;
      }
    }
    // Texto com a questão que os alunos mais erraram, a alternativa errada mais respondida, com sua respectiva quantidade de alunos
    // e a alternativa correta, também com sua respectiva quantidade de alunos
    var textoB = 'Questão: '+questao+'\nResposta esperada: '+ altCorreta +' ('+ cont1 +' aluno(s))'+
              '\nResposta errada: '+ altErrada +' ('+ cont2 +' aluno(s))';
    
    return textoB;
  }
}

/*
  Recebe um array com as alternativas que os alunos erraram e retorna a alternativa errada que os alunos mais responderam
*/
function getAltMaisRepetida(arrayAlt){
  var arrayAux = [];
  var arrayRepet = [];
  var arrayOcorrency = []; // Armazena o objeto ocorrency, onde o primeiro elemento é a alternativa e o segundo a sua ocorrência.
  
  // for i: Adiciona os números existentes do arrayAlt no arrayAux sem repetições
  for(var i = 0; i < arrayAlt.length; i++){
    if(arrayAux.length >= 1){
      var flag = false; // Para sinalizar, caso o dado elemento já exista na lista
      // Verifica se no arrayAux existe dado elemento, impossibilitando repetições
      for(var j = 0; j < arrayAux.length; j++){
        if(arrayAux[j] == arrayAlt[i]){ // Se o elemento já está na lista
          flag = true; // Sinaliza
        }
      }
      if(flag == false){ // Se estiver sinalizado(flag = true) não entra
        arrayAux.push(arrayAlt[i]);
      }
    } else {
      arrayAux.push(arrayAlt[i]);
    }
  } // fim for i
  
  // O elemento k do arrayAux terá n repetições no arrayAlt, o número de repetições, cont, será o contador da ocorrência de dada alternativa
  // no mesmo índice que o elemento k possui no arrayAux. Ex.: arrayAux = [A,B] arrayAlt = [A,A,B,B,B] arrayRepet = [2, 3]
  var cont = 0;
  for(var k = 0; k < arrayAux.length; k++){
    for(var l = 0; l < arrayAlt.length; l++){
      if(arrayAux[k] == arrayAlt[l]){
        cont++; // Quantidade de vezes que a alternativa se repete
      }
    } // fim for l
    
    var ocorrency = {
      'alternativa': arrayAux[k],
      'valor': cont
    };
    arrayOcorrency.push(ocorrency); // Adiciona o objeto ocorrency no arrayOcorrency
    
    arrayRepet.push(cont);
    cont = 0;
  } // fim for k
  
  // var maior = arrayOcorrency[0][1]; // Assume que o primeiro elemento é o maior
  var maior = arrayOcorrency[0].valor;
  var indice = 0; // guarda o índice do primeiro elemento
  for(var m = 1; m < arrayOcorrency.length; m++){
    if(arrayOcorrency[m].valor > maior){ // Se o próximo elemento for maior que o anterior(maior)
      maior = arrayOcorrency[m].valor; // Atualiza o valor de maior
      indice = m; // Atualiza o índice
    } 
  }
  return arrayOcorrency;
}

/*
  Recebe o array com as questões que o aluno acertou e retorna um percentual das questões que ele errou e acertou
*/
function percentAcertos(acertos){
  // Quantidade de questões do formulário, exceto a área de email do aluno
  var qtdeQuestoes = getQstMultipleChoice().length;
  var part = acertos.length / qtdeQuestoes;
  var percentAcertos = 0;
  if(acertos.length != 0){
    percentAcertos = (part*100).toFixed(2);
  } 
  var texto;
  if(percentAcertos >= 70){
    texto = 'Você acertou ' + percentAcertos+'%'+ ' das questões, ou seja, ' + acertos.length + ' dentre as ' + qtdeQuestoes +
    ' questões da atividade.\n\nParabéns!';
    contMaiorDesemp++;
    return texto;
  } else {
    texto = 'Você acertou ' + percentAcertos+'%'+ ' das questões, ou seja, ' + acertos.length + ' dentre as ' + qtdeQuestoes +
    ' questões da atividade.\nContinue estudando!\n';
    return texto;
  }
}

/*
    Feedback Professor
    Email com relatório da quantidade de alunos que responderam o exercício, das questões as
    quais obtiveram maior índice de erro e as alternativas erradas mais respondidas pelos alunos.
*/
function feedbackProfessor(){
  var qtdeEnvioEmailsProf = 0;
  // Obtém as respostas do formulário. As linhas equivalentes as respostas dos usuários
  var qtdeRespondentes = FormApp.getActiveForm().getResponses().length;
  // Cálculo da porcentagem de alunos com maior e menor desempenho
  var percentMaiorDesemp = ((contMaiorDesemp / qtdeRespondentes)*100).toFixed(2);
  var percentMenorDesemp = 100-percentMaiorDesemp;
  var qtdeMenorDesemp = qtdeRespondentes-contMaiorDesemp;
  var texto;
  if(percentMaiorDesemp < 100){
    // Texto com as questões que os alunos mais erraram
    var texto1 = getQuestoesMaisErros(questMaisErros);
    // Texto com o percentual junto com as questões que os alunos mais erraram
    texto = 'Olá professor(a), \n\n' + qtdeRespondentes + ' aluno(s) responderam ao exercício. Destes, '+percentMaiorDesemp+'% ('+contMaiorDesemp+' aluno(s))'+
    ' acertaram mais de 70% do exercício e '+ percentMenorDesemp +'% ('+ qtdeMenorDesemp +' aluno(s)) tiveram um desempenho inferior.\n\n'+ texto1;
  } else {
    texto = 'Olá professor, \n\n' + qtdeRespondentes + ' aluno(s) responderam ao exercício. Destes, '+percentMaiorDesemp+'% ('+contMaiorDesemp+' aluno(s))'+
    ' acertaram mais de 70% do exercício e '+ percentMenorDesemp +'% ('+ qtdeMenorDesemp +' aluno(s)) tiveram um desempenho inferior.\n';
  }
    
  // Obtém o email dos professores para enviar o feedback
  var professores = FormApp.getActiveForm().getEditors();
  for(var i = 0; i<professores.length; i++){
    MailApp.sendEmail(professores[i].getEmail(), 'Relatório do(a) '+ FormApp.getActiveForm().getTitle(), texto);
    qtdeEnvioEmailsProf++;
  }
}
